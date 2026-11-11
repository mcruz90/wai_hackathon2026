import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

test("Ontario discovery with PostgreSQL and the real offline intake pipeline", {skip:!process.env.REVIEW_TEST_DATABASE_URL}, async (t)=>{
  const {PrismaClient}=await import("@prisma/client");
  const {addDiscoverySource,collectSource,runDiscoveryJob}=await import("../lib/discovery/service");
  const {parsePage}=await import("../lib/discovery/web");
  const {runIntakeAgent}=await import("../lib/agent/intake");
  const {reviewedClinicHosts}=await import("../lib/source-trust");
  const {runDiscoveryDemo}=await import("../lib/discovery/demo");
  const schema=`discovery_test_${randomUUID().replaceAll("-","")}`;
  const url=new URL(process.env.REVIEW_TEST_DATABASE_URL!);
  const root=new PrismaClient({datasourceUrl:url.toString()});url.searchParams.set("schema",schema);
  const db=new PrismaClient({datasourceUrl:url.toString()});
  const now=new Date(),date=new Date(now.getTime()-864e5).toISOString().slice(0,10);
  let intakeCalls=0,fetchCalls=0,searchCalls=0;
  const html=(full=false)=>`<head><title>Rideau Clinic announcement</title></head><body><p>${date}: Registration at Rideau Family Clinic in Ottawa K1S 1A1. Our family doctor is ${full?"no longer accepting":"accepting"} new patients. Care in English and French. Call 613-555-0123.</p></body>`;
  const deps={fetchPage:async (url:string)=>{fetchCalls++;return parsePage(html(),url)},intake:async (input:Parameters<typeof runIntakeAgent>[0])=>{intakeCalls++;return runIntakeAgent({...input,offline:true})}};
  try{
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    for(const folder of (await readdir("prisma/migrations")).filter(x=>/^\d/.test(x)).sort())for(const sql of (await readFile(`prisma/migrations/${folder}/migration.sql`,"utf8")).split(";").map(x=>x.trim()).filter(Boolean))await db.$executeRawUnsafe(sql);
    await db.fsaCentroid.create({data:{fsa:"K1S",lat:45.4,lng:-75.7}});
    let sourceId="",listingId="";
    await t.test("search adds pending leads without fetching or publishing, and shares a daily search budget",async()=>{
      const search=async()=>{searchCalls++;return [{url:"https://clinic.example/registration",title:"Ottawa announcement",query:"Ontario family doctor"}]};
      const first=await runDiscoveryJob(db,{manual:true,now,deps:{...deps,search}});
      const second=await runDiscoveryJob(db,{manual:true,now,deps:{...deps,search}});
      assert.equal(first.found,1);assert.equal(second.found,0);assert.equal(searchCalls,1);assert.equal(fetchCalls,0);assert.equal(await db.listing.count(),0);
      const source=await db.discoverySource.findUniqueOrThrow({where:{url:"https://clinic.example/registration"}});sourceId=source.id;
      assert.equal(source.status,"pending");assert.equal(source.trustedClinic,false);assert.ok(!(await reviewedClinicHosts(db)).includes(source.host));
    });
    await t.test("approved clinic collection creates evidence and an unpublished Ontario candidate",async()=>{
      const source=await db.discoverySource.update({where:{id:sourceId},data:{status:"active",kind:"clinic",trustedClinic:true,nextCheckAt:now}});
      assert.equal(await collectSource(db,source,deps,now),"proposed");assert.equal(intakeCalls,1);
      const candidate=await db.listing.findFirstOrThrow();listingId=candidate.id;
      assert.equal(candidate.fsa,"K1S");assert.equal(candidate.area,"Ottawa");assert.equal(candidate.status,"pending");assert.equal(candidate.lastConfirmedAt,null);
      const check=await db.discoveryCheck.findFirstOrThrow();assert.equal(check.retrievedAt.toISOString(),now.toISOString());assert.equal(check.outcomeId,candidate.id);
      assert.ok((candidate.confidence as Record<string,unknown>).discovery);assert.ok((await reviewedClinicHosts(db)).includes(source.host));
    });
    await t.test("unchanged pages create no new proposal and never refresh a published listing",async()=>{
      const confirmed=new Date(`${date}T17:00:00Z`);
      await db.listing.update({where:{id:listingId},data:{status:"live",lastConfirmedAt:confirmed,expiresAt:new Date(now.getTime()+20*864e5)}});
      const source=await db.discoverySource.findUniqueOrThrow({where:{id:sourceId}});
      assert.equal(await collectSource(db,source,deps,new Date(now.getTime()+2*864e5)),"unchanged");assert.equal(intakeCalls,1);assert.equal(await db.discoveryCheck.count(),1);
      assert.equal((await db.listing.findUniqueOrThrow({where:{id:listingId}})).lastConfirmedAt!.toISOString(),confirmed.toISOString());
    });
    await t.test("changed availability proposes marking full without changing the live listing",async()=>{
      const source=await db.discoverySource.findUniqueOrThrow({where:{id:sourceId}});
      const outcome=await collectSource(db,source,{...deps,fetchPage:async(url)=>parsePage(html(true),url)},new Date(now.getTime()+4*864e5));
      assert.equal(outcome,"proposed");assert.equal(await db.discoveryCheck.count(),2);
      assert.equal((await db.agentProposal.findFirstOrThrow()).action,"mark_full");assert.equal((await db.listing.findUniqueOrThrow({where:{id:listingId}})).status,"live");
    });
    await t.test("concurrent collectors claim a source once",async()=>{
      const source=await db.discoverySource.findUniqueOrThrow({where:{id:sourceId}}),before=intakeCalls;
      const changed={...deps,fetchPage:async(url:string)=>parsePage(html().replace("English and French","English, French and Spanish"),url)};
      const results=await Promise.all([collectSource(db,source,changed,new Date(now.getTime()+6*864e5)),collectSource(db,source,changed,new Date(now.getTime()+6*864e5))]);
      assert.equal(results.filter(x=>x==="proposed").length,1);assert.equal(intakeCalls,before+1);
    });
    await t.test("directories discover links only; linked pages require their own review",async()=>{
      const source=await addDiscoverySource(db,{url:"https://directory.example/ontario"});await db.discoverySource.update({where:{id:source.id},data:{kind:"directory",status:"active",nextCheckAt:now}});
      const before=intakeCalls;
      const outcome=await collectSource(db,{...source,kind:"directory",status:"active"},{...deps,fetchPage:async(url)=>parsePage('<body>Accepting new patients <a href="https://newclinic.example/registration">Family clinic registration</a></body>',url)},now);
      assert.equal(outcome,"skipped");assert.equal(intakeCalls,before);
      const lead=await db.discoverySource.findUniqueOrThrow({where:{url:"https://newclinic.example/registration"}});assert.equal(lead.status,"pending");assert.equal(lead.trustedClinic,false);
    });
    await t.test("social sources are never fetched by the website collector",async()=>{
      const source=await addDiscoverySource(db,{url:"https://www.instagram.com/exampleclinic"});await db.discoverySource.update({where:{id:source.id},data:{status:"active",nextCheckAt:now}});
      const before=fetchCalls;assert.equal(await collectSource(db,{...source,status:"active"},deps,now),"error");assert.equal(fetchCalls,before);
    });
    await t.test("intake failures retain evidence and do not blindly retry the same content",async()=>{
      const source=await addDiscoverySource(db,{url:"https://failed.example/registration"});await db.discoverySource.update({where:{id:source.id},data:{kind:"clinic",status:"active",nextCheckAt:now}});
      let attempts=0;const failing={...deps,intake:async()=>{attempts++;throw new Error("Provider unavailable")}};
      assert.equal(await collectSource(db,{...source,kind:"clinic",status:"active"},failing,now),"error");
      assert.equal((await db.discoveryCheck.findFirstOrThrow({where:{sourceId:source.id}})).status,"error");
      assert.equal(await collectSource(db,{...source,kind:"clinic",status:"active"},failing,new Date(now.getTime()+864e5)),"unchanged");assert.equal(attempts,1);
    });
    await t.test("pausing a source during collection prevents intake and removes batch trust",async()=>{
      const source=await db.discoverySource.update({where:{id:sourceId},data:{nextCheckAt:now}});
      const before=intakeCalls;
      assert.equal(await collectSource(db,source,{...deps,fetchPage:async(url)=>{await db.discoverySource.update({where:{id:source.id},data:{status:"paused",trustedClinic:false}});return parsePage(html(),url)}},now),"paused");
      assert.equal(intakeCalls,before);assert.ok(!(await reviewedClinicHosts(db)).includes(source.host));
    });
    await t.test("another announcement matching a pending clinic is held as a duplicate",async()=>{
      const source=await addDiscoverySource(db,{url:"https://duplicate.example/registration"});
      await db.discoverySource.update({where:{id:source.id},data:{status:"active",kind:"clinic",nextCheckAt:now}});
      const pending=await db.listing.create({data:{clinic:"Birch Sample Clinic",area:"Ottawa",fsa:"K1S",lat:45.4,lng:-75.7,providerType:"family_doctor",languages:["English"],phone:"613-555-0199",sourceType:"web"}});
      const before=await db.listing.count();
      const result=await collectSource(db,{...source,status:"active",kind:"clinic"},{...deps,fetchPage:async(url)=>parsePage(`<body>${date}: Registration at Birch Sample Clinic in Ottawa K1S 1A1. A family doctor is accepting new patients in English. Call 613-555-0199.</body>`,url)},now);
      assert.equal(result,"proposed");assert.equal(await db.listing.count(),before);
      const check=await db.discoveryCheck.findFirstOrThrow({where:{sourceId:source.id}});
      const proposal=await db.agentProposal.findUniqueOrThrow({where:{id:check.outcomeId!}});assert.equal(proposal.action,"no_listing");
      assert.equal((await db.listing.findUniqueOrThrow({where:{id:pending.id}})).status,"pending");
    });
    await t.test("offline Ontario demo requires source approval and produces sample data without an API key",async()=>{
      assert.match(await runDiscoveryDemo(db),/ready for review/);
      const source=await db.discoverySource.findUniqueOrThrow({where:{url:"https://demo-clinic.example/ottawa-announcement"}});
      await db.discoverySource.update({where:{id:source.id},data:{status:"active",kind:"clinic"}});
      assert.match(await runDiscoveryDemo(db),/No network or LLM calls/);
      const sample=await db.listing.findFirstOrThrow({where:{isSample:true}});assert.equal(sample.fsa,"K1S");assert.equal(sample.status,"pending");
      assert.match(await runDiscoveryDemo(db),/unchanged/);assert.equal(await db.listing.count({where:{isSample:true}}),1);
    });
    await t.test("starter catalog preserves source decisions and does not collect pages",async()=>{
      const {seedDiscoverySources}=await import("../lib/discovery/seeds");
      const beforeFetch=fetchCalls;
      assert.equal(await seedDiscoverySources(db),10);
      const source=await db.discoverySource.findUniqueOrThrow({where:{url:"https://www.openfieldmc.com/"}});
      assert.equal(source.status,"pending");
      await db.discoverySource.update({where:{id:source.id},data:{status:"rejected"}});
      assert.equal(await seedDiscoverySources(db),0);
      assert.equal((await db.discoverySource.findUniqueOrThrow({where:{id:source.id}})).status,"rejected");
      assert.equal(fetchCalls,beforeFetch);
    });
  }finally{await db.$disconnect();await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await root.$disconnect()}
});
