export const libraryMeta = {
  version: '1.0.0', source: '开口迎客需求文档V2.0与信息架构图',
  scope: '首期三个情境、每章四个短课',
  notice: '下列句子是通用沟通练习，不包含未经确认的真实价格、配方或文化结论。'
}
export const stages = [
  { id:'listen', title:'听懂情境', short:'听懂', icon:'ear', help:'听听游客想了解什么' },
  { id:'keywords', title:'关键词', short:'词语', icon:'text-aa', help:'把重要的信息说清楚' },
  { id:'repeat', title:'短句跟说', short:'跟说', icon:'microphone', help:'先听示范，再自己说一遍' },
  { id:'retell', title:'看图复述', short:'复述', icon:'image', help:'试着用自己的话介绍' },
  { id:'dialogue', title:'AI游客对话', short:'对话', icon:'chats-circle', help:'练习回应游客的追问' },
  { id:'challenge', title:'独立挑战', short:'挑战', icon:'flag', help:'不看完整答案，自己说一说' }
]
export const scenarios = [
  { id:'welcome', title:'欢迎询问', subtitle:'问候、人数与基本接待', image:'welcome', color:'green', minutes:5, icon:'hand-waving', goal:'欢迎游客，并了解对方的需要', task:'主动欢迎一位游客，询问想了解什么。', facts:['问候','游客需要'], questions:['你好，这里卖什么？','我们想先看一看，可以吗？','可以给我们介绍一下吗？'], words:['欢迎','几位','请进','需要'], lessons:[
    {id:'welcome-1',title:'听懂游客的需要',brief:'听懂问候与询问',stages:['listen','keywords'],question:'你好，我们可以先看看吗？',choices:['游客想先看一看','游客在问价格','游客想问路'],answer:0,sentence:'欢迎您，可以先看一看。'},
    {id:'welcome-2',title:'自然地欢迎游客',brief:'问候与询问人数',stages:['repeat','retell'],question:'你好，我们一共三个人。',choices:['三个人','一个人','五个人'],answer:0,sentence:'欢迎您！请问一共几位？'},
    {id:'welcome-3',title:'回应游客的提问',brief:'练习接待中的短对话',stages:['dialogue'],question:'这里有什么可以了解的？',sentence:'您想了解哪一种？我给您介绍。'},
    {id:'welcome-4',title:'独立完成一次欢迎',brief:'不看答案完成接待',stages:['challenge'],question:'请欢迎刚到的游客，并问问对方需要什么。',sentence:'欢迎您！有什么需要我帮忙的吗？'}
  ]},
  { id:'price',title:'价格购买',subtitle:'数字、数量、单位与支付',image:'product',color:'amber',minutes:6,icon:'currency-cny',goal:'把金额、单位与购买数量说清楚',task:'不看手机，向游客说明一种商品的价格和计价单位。',facts:['金额','单位','数量'],questions:['这个怎么卖？','我想买两份，一共多少钱？','我可以扫码付款吗？'],words:['价格','每份','一共','扫码'],lessons:[
    {id:'price-1',title:'分清价格和数字',brief:'听清金额与数量',stages:['listen','keywords'],question:'这个是十三元一份吗？',choices:['十三元一份','三十元一份','三元一份'],answer:0,sentence:'请再确认一下价格。',note:'十三元仅用于数字听辨，并非真实商品价格。'},
    {id:'price-2',title:'报价时带上单位',brief:'练习每份与每件',stages:['repeat','retell'],question:'这是按份卖，还是按件卖？',sentence:'我们按份卖。请让我为您确认价格。'},
    {id:'price-3',title:'回应购买与付款',brief:'数量确认和付款表达',stages:['dialogue'],question:'我想买两份，可以扫码吗？',sentence:'您要两份，对吗？请先确认总价。'},
    {id:'price-4',title:'独立完成一次报价',brief:'说清金额、单位和数量',stages:['challenge'],question:'请用你实际确认的价格，说明商品怎么卖。',sentence:'请根据已确认的真实价格回答。'}
  ]},
  {id:'product',title:'特色商品介绍',subtitle:'名称、原料、制作与保存',image:'product',color:'blue',minutes:6,icon:'jar',goal:'介绍一种自家商品，并接住游客追问',task:'向一位游客介绍商品名称、主要材料和制作方法。',facts:['商品名称','主要材料','制作方法'],questions:['这个商品叫什么？','主要用什么材料做的？','是怎么制作的？','应该怎么保存？'],words:['名称','材料','制作','保存'],lessons:[
    {id:'product-1',title:'听懂商品问题',brief:'分清游客想知道什么',stages:['listen','keywords'],question:'这个是用什么材料做的？',choices:['游客在问材料','游客在问价格','游客在问方向'],answer:0,sentence:'您想了解主要材料，对吗？'},
    {id:'product-2',title:'把商品介绍完整',brief:'名称、材料与制作',stages:['repeat','retell'],question:'可以介绍一下这个商品吗？',sentence:'这是我们自家做的商品。我给您介绍一下。'},
    {id:'product-3',title:'接住游客的追问',brief:'围绕材料与制作回答',stages:['dialogue'],question:'它是怎么做出来的？',sentence:'我可以给您讲讲我们家的制作方法。'},
    {id:'product-4',title:'独立介绍自家商品',brief:'不看答案完成介绍',stages:['challenge'],question:'请介绍一种自家商品，说清名称、材料和制作方法。',sentence:'只使用你已确认的自家经营信息。'}
  ]}
]
export const publicScenes = [
  {id:'welcome',title:'欢迎游客',icon:'hand-waving',color:'green'},
  {id:'price',title:'数字价格',icon:'currency-cny',color:'amber'},
  {id:'price',title:'支付表达',icon:'qr-code',color:'blue'},
  {id:'route',title:'路线指引',icon:'signpost',color:'amber',future:true},
  {id:'welcome',title:'礼貌回应',icon:'chats-circle',color:'green'}
]
export const occupations=[{id:'homestay',title:'家庭民宿',icon:'house',future:true},{id:'food',title:'餐饮服务',icon:'bowl-food'},{id:'product',title:'特色商品',icon:'jar'},{id:'craft',title:'手工艺',icon:'basket',future:true},{id:'culture',title:'文化讲解',icon:'book-open',future:true}]
export const tourists=[
  {id:'first',title:'初次游客',desc:'问题简单，一次问一件事',image:'tourist-first',color:'amber'},
  {id:'curious',title:'好奇游客',desc:'想了解材料和制作过程',image:'tourist-curious',color:'green'},
  {id:'elder',title:'老年游客',desc:'放慢速度，耐心确认',image:'tourist-elder',color:'blue'},
  {id:'family',title:'家庭游客',desc:'练习组织多项信息',image:'tourist-family',color:'green'},
  {id:'busy',title:'匆忙游客',desc:'简洁清楚地回应',image:'tourist-busy',color:'blue'},
  {id:'confused',title:'没听懂的游客',desc:'换一种说法再解释',image:'tourist-confused',color:'amber'}
]
export const reviewTypes=[{id:'pronunciation',title:'发音复习',desc:'练习影响理解的词',icon:'speaker-high',color:'green'},{id:'listening',title:'听力复习',desc:'听懂不同说法和语速',icon:'headphones',color:'blue'},{id:'expression',title:'表达复习',desc:'补全遗漏的关键信息',icon:'chats-circle',color:'amber'},{id:'scenario',title:'情境复习',desc:'减少提示再练一次',icon:'mountains',color:'green'},{id:'real',title:'真实问题复习',desc:'练习上次没说出的话',icon:'note',color:'blue'}]
export const reflections=['顺利完成','只说了一部分','游客没有听懂','还没有敢开口','出现了新问题']
export function getScenario(id){return scenarios.find(s=>s.id===id)||scenarios[2]}
export function getLesson(id){return scenarios.flatMap(s=>s.lessons).find(l=>l.id===id)||scenarios[2].lessons[0]}

// 固定课程问答的角色变体；不是实时模型生成。
const dialogueVariants={
 welcome:{
  first:['你好，这里可以先看看吗？','我们两个人，方便吗？','可以简单介绍一下吗？'],
  curious:['你好，这里有什么可以了解的？','我想多了解一点，可以吗？','你能先给我们介绍哪一项？'],
  elder:['你好，我想先看一看。','可以说慢一点吗？','能再告诉我这里有什么吗？'],
  family:['你好，我们一家人想先看看。','有孩子一起，可以先简单介绍吗？','我们想了解这里有什么。'],
  busy:['你好，能简单介绍一下吗？','我们时间不多，可以先看看吗？','请问这里主要提供什么？'],
  confused:['你好，刚才没听清，可以再说一次吗？','你能换一种说法介绍吗？','我想先看看，可以吗？']
 },
 price:{
  first:['这个怎么卖？','两份的总价是多少？','可以怎么付款？'],
  curious:['这个价格按什么单位计算？','买两份怎么计算总价？','付款前可以再核对一下吗？'],
  elder:['这个多少钱一份？','请慢一点说，两份多少钱？','能再确认一下付款方式吗？'],
  family:['我们一家想买几份，怎么卖？','先买两份，一共多少钱？','可以一起付款吗？'],
  busy:['请直接告诉我单价和单位。','我要两份，总共多少？','怎么付款比较方便？'],
  confused:['刚才价格没听清，可以再说一次吗？','这个价格是每份还是每件？','能把总价再确认一次吗？']
 },
 product:{
  first:['这个商品叫什么？','主要是什么材料？','可以简单说说怎么制作吗？'],
  curious:['这个商品叫什么？','主要用什么材料做的？','是怎么制作的？'],
  elder:['这个叫什么名字？','材料是什么？请慢一点说。','制作方法可以再讲简单一点吗？'],
  family:['这个商品叫什么？','能给我们介绍一下主要材料吗？','孩子也想了解，是怎么制作的？'],
  busy:['请简单说一下商品名称。','主要材料是什么？','一句话介绍制作方法，可以吗？'],
  confused:['这个名字我没听清，可以再说一次吗？','刚才材料没听懂，可以换个说法吗？','制作过程可以分两步讲吗？']
 }
}
export function getDialogueQuestions(scenarioId,roleId){return dialogueVariants[scenarioId]?.[roleId]||getScenario(scenarioId).questions.slice(0,3)}
