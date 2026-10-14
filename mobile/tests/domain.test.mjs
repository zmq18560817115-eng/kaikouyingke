import {test} from 'node:test';import assert from 'node:assert/strict';import d from '../src/domain.mjs'
test('重复完成课程不会重复累计进度和日期',()=>{const s=d.fresh();d.completeLesson(s,'welcome-1','2026-10-14');d.completeLesson(s,'welcome-1','2026-10-14');assert.deepEqual(s.completed,['welcome-1']);assert.equal(s.learningDates.length,1)})
test('复习去重，但已完成后可再次入队',()=>{const s=d.fresh();d.addReview(s,{target:'p1',type:'listening'});d.addReview(s,{target:'p1',type:'listening'});assert.equal(s.reviews.length,1);s.reviews[0].done=true;d.addReview(s,{target:'p1',type:'listening'});assert.equal(s.reviews.length,2)})
test('个人课程不猜测未确认的原料或价格',()=>{const c=d.createPersonal({name:'自家商品'},'p1');assert.equal(c.short,'这是我们自家的自家商品。');assert.ok(!c.full.includes('元'));assert.ok(!c.full.includes('材料'))})
test('只有金额和单位都确认才生成报价',()=>{assert.ok(!d.createPersonal({name:'商品',price:'20'},'p').full.includes('20'));assert.ok(d.createPersonal({name:'商品',price:'20',unit:'每份'},'p').full.includes('20元每份'))})
test('删除录音清除关联，其他记录保持',()=>{const s=d.fresh();s.recordings=[{id:'a'},{id:'b'}];s.attempts=[{recordingId:'a'}];s.drafts=[{recordingId:'a'}];d.deleteRecording(s,'a');assert.deepEqual(s.recordings,[{id:'b'}]);assert.equal(s.attempts[0].recordingId,null);assert.equal(s.drafts[0].recordingId,null)})

test('无效价格不能被整理成确认事实',()=>{for(const price of ['-1','abc','2.345'])assert.throws(()=>d.createPersonal({name:'商品',price,unit:'每份'},'p'),/有效金额/);assert.ok(d.createPersonal({name:'商品',price:'0',unit:'每份'},'p').full.includes('0元每份'))})
