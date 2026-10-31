export const DAY=86400000;
export const LIMIT=50000; // 大额协议演示阈值：500元，可按运营规则调整
export const time=d=>new Date(d).getTime();
export const addDays=(d,n)=>new Date(time(d)+DAY*n).toISOString();
export const money=n=>(n/100).toFixed(2);
export const closed=t=>['done','cancelled'].includes(t.status);
export function graduation(u,now){const days=Math.ceil((time(u.graduate)-time(now))/DAY);return {days,stage:days<0?'已毕业':days<=30?'准备毕业':'在校',deadline:addDays(u.graduate,7)};}
export function eligibility(u,now){if(u.id==='admin')return '管理员不参与接单';if(u.cert!=='approved')return '请先完成学生证与学籍证明双重审核';if(time(now)>=time(u.validUntil))return '学籍报告已过期，请续期并重新审核';if(time(now)>=time(u.graduate))return '已进入毕业清算期，暂停接新任务';return '';}
export function seed(){const now='2026-10-31T14:00:00+08:00';const base={school:'青禾大学',cert:'approved',validUntil:'2027-04-30T23:59:59+08:00',graduate:'2027-06-30T23:59:59+08:00'};const users=[{...base,id:'lin',name:'林同学',tag:'发布者',avatar:'林'},{...base,id:'chen',name:'陈同学',tag:'接单者',avatar:'陈'},{...base,id:'zhou',name:'周同学',tag:'认证过期',avatar:'周',validUntil:'2026-10-30T23:59:59+08:00'},{...base,id:'xu',name:'许同学',tag:'即将毕业',avatar:'许',graduate:'2026-11-20T23:59:59+08:00'},{...base,id:'admin',name:'校园管理员',tag:'审核与申诉',avatar:'管'}];
const rows=[['t1','lin','快递代取','帮取一个小包裹，顺路到南苑','菜鸟驿站','南苑 3 栋楼下',400,0,'包裹约 1kg，不需要上楼。到楼下联系就好。','16:30'],['t2','lin','校园代买','图书馆续命咖啡，冰美式一杯','一食堂咖啡店','图书馆一楼',500,3000,'少冰，不加糖。如售罄请先联系我。','16:00'],['t3','xu','打印代取','论文打印，帮我送到教学楼','校园打印店','明德楼一楼',600,0,'已在线支付打印费，取件报订单尾号 0621。','17:00'],['t4','lin','校内送物','落在教室的教材，帮忙带回来','明德楼 201','北苑大厅',350,0,'蓝色封面的统计学教材，送到大厅即可。','18:00'],['t5','lin','校园代买','代买绘图板，需确认大额物品协议','校园数码店','南苑会客区',1200,68000,'请核对型号和封装，保留小票。双方确认协议后接单。','19:00'],['t6','chen','快递代取','两本新书，想找顺路的同学','东门快递点','图书馆入口',450,0,'已经到站，小件可手提。','17:30']];
const tasks=rows.map(r=>({id:r[0],owner:r[1],kind:r[2],title:r[3],from:r[4],to:r[5],fee:r[6],budget:r[7],note:r[8],due:`2026-10-31T${r[9]}:00+08:00`,value:r[7],status:'open',runner:null,paid:r[6]+r[7],agreement:r[7]>=LIMIT,events:[{text:'发布者已模拟支付，资金待结算',at:now}],reviews:{}}));return {version:1,now,user:'chen',users,tasks,ledger:[],seq:7};}
function requireThat(ok,msg){if(!ok)throw new Error(msg);}
export function act(s,command,id,data={}){
 const u=s.users.find(x=>x.id===s.user);const t=s.tasks.find(x=>x.id===id); const event=text=>t.events.push({text,at:s.now});
 if(command==='publish'){
 requireThat(!eligibility(u,s.now),eligibility(u,s.now));const fee=Number(data.fee),budget=Number(data.budget),value=Number(data.value);
 requireThat(Number.isSafeInteger(fee)&&fee>=100&&fee<=100000,'跑腿报酬需在1至1000元之间');requireThat(Number.isSafeInteger(budget)&&budget>=0&&budget<=1000000,'代买预算需在0至10000元之间');requireThat(Number.isSafeInteger(value)&&value>=0&&value<=1000000,'请填写合理物品价值');
 requireThat(['快递代取','校园代买','打印代取','校内送物'].includes(data.kind),'请选择任务类型');requireThat(data.kind==='校园代买'||budget===0,'非代买任务无需商品预算');requireThat(data.kind!=='校园代买'||budget>0,'代买任务需要商品预算');
 requireThat(time(data.due)>time(s.now)&&time(data.due)<=time(u.graduate),'截止时间应晚于当前演示时间、早于毕业时间');for(const k of ['title','from','to'])requireThat(String(data[k]||'').trim().length>0, '请填写完整任务信息');
 requireThat(Math.max(value,budget)<LIMIT||data.agreement,'大额物品需先阅读并确认风险与责任协议');
 const n={id:'t'+s.seq++,owner:u.id,runner:null,kind:data.kind,title:data.title.slice(0,60),from:data.from.slice(0,60),to:data.to.slice(0,60),note:String(data.note||'').slice(0,400),due:data.due,fee,budget,value,paid:fee+budget,agreement:!!data.agreement,status:'open',reviews:{},events:[{text:'发布者已模拟支付，资金待结算',at:s.now}]};s.tasks.unshift(n);return n;
 }
 if(command==='submitCert'){requireThat(u.id!=='admin','管理员不能提交');requireThat(data.card&&data.report,'请同时选择学生证与可查验学籍证明示例');u.cert='pending';return;}
 if(command==='approveCert'){requireThat(u.id==='admin','需要管理员审核');const target=s.users.find(x=>x.id===id);requireThat(target?.cert==='pending','仅可审核待审核申请');target.cert='approved';target.validUntil=addDays(s.now,180);return;}
 requireThat(t,'任务不存在');const member=t.owner===u.id||t.runner===u.id;
 if(command==='accept'){requireThat(t.status==='open','任务已被接走或已结束');requireThat(t.owner!==u.id,'不能接自己的订单');requireThat(!eligibility(u,s.now),eligibility(u,s.now));requireThat(s.users.find(x=>x.id===t.owner).school===u.school,'只能接本校任务');requireThat(time(t.due)>time(s.now),'任务已超过截止时间');requireThat(time(t.due)<time(u.graduate),'任务时间超过毕业时间');requireThat(Math.max(t.value,t.budget)<LIMIT||data.agreement,'大额任务需双方确认协议');t.runner=u.id;t.status='accepted';t.runnerAgreement=!!data.agreement;event('接单成功，进入履约中');}
 else if(command==='deliver'){requireThat(t.runner===u.id&&t.status==='accepted','仅接单者可提交履约中的订单');const actual=t.budget?Number(data.actual):0;requireThat(Number.isSafeInteger(actual)&&actual>=0&&actual<=t.budget,'实际商品款不能超过已支付预算；超额请先协商补款，雏形暂不支持补款');requireThat(data.proof,'请先添加交付凭证');t.actual=actual;t.proof=true;t.deliveredAt=s.now;t.status='delivered';event('已提交交付示例照片，等待发布者确认');}
 else if(command==='dispute'){requireThat(member&&['accepted','delivered'].includes(t.status),'此订单不能发起申诉');requireThat(String(data.reason||'').trim(),'请填写纠纷说明');t.status='disputed';t.dispute=String(data.reason).slice(0,500);event('已发起申诉，资金暂停结算');}
 else if(command==='cancel'){requireThat(t.owner===u.id&&t.status==='open','仅未接单的发布者可直接取消');t.status='cancelled';s.ledger.push({task:t.id,user:t.owner,amount:t.paid,type:'退款',at:s.now});event('未接单取消，模拟预付款已全额退回');}
 else if(command==='confirm'||command==='resolvePay'){
 requireThat(command==='confirm'?(u.id===t.owner&&t.status==='delivered'):(u.id==='admin'&&t.status==='disputed'&&t.proof),'需要收货确认或有交付凭证的管理员裁决');if(command==='resolvePay')requireThat(String(data.reason||'').trim(),'裁决需要填写理由');
 const actual=t.actual||0;requireThat(actual<=t.budget,'商品金额异常');t.status='done';s.ledger.push({task:t.id,user:t.runner,amount:t.fee,type:'跑腿收入',at:s.now});if(actual)s.ledger.push({task:t.id,user:t.runner,amount:actual,type:'垫付款返还',at:s.now});if(t.budget>actual)s.ledger.push({task:t.id,user:t.owner,amount:t.budget-actual,type:'预算差额退款',at:s.now});event(command==='confirm'?'发布者确认收货，模拟结算完成':'管理员裁决结算：'+String(data.reason).slice(0,300));
 }
 else if(command==='resolveRefund'){requireThat(u.id==='admin'&&t.status==='disputed','需要管理员处理申诉');requireThat(String(data.reason||'').trim(),'裁决需要填写理由');t.status='cancelled';s.ledger.push({task:t.id,user:t.owner,amount:t.paid,type:'申诉退款',at:s.now});event('管理员裁决全额退款：'+String(data.reason).slice(0,300));}
 else if(command==='review'){requireThat(member&&t.status==='done'&&!t.reviews[u.id],'仅完成订单可评价一次');requireThat([1,2,3,4,5].includes(Number(data.stars)),'请选择1至5星');t.reviews[u.id]={stars:Number(data.stars),text:String(data.text||'').slice(0,200)};event('已提交评价，双方评价后公开');}
 else throw new Error('不支持的操作');return t;
}
