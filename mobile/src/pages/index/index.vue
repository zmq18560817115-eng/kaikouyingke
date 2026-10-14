<template>
<view class="app-shell" :class="{'large-type':state.settings.largeText}" :style="{'--status-gap':statusGap+'px'}">
  <view v-if="isMain" class="main-view">
    <view class="landscape-header" :class="{'home-header':tab==='home'}">
      <image class="landscape" src="/static/images/landscape.jpg" mode="aspectFill" />
      <view class="hero-copy"><text class="hero-title">{{tabTitle}}</text><text class="hero-subtitle">{{tabSubtitle}}</text></view>
    </view>

    <view v-if="tab==='home'" class="main-content home-content">
      <view class="card today-card">
        <view class="today-info"><view><text class="eyebrow">今日练习</text><text class="today-title">{{currentScenario.title}}</text><text class="progress-description">{{completedIn(currentScenario)}} / 4 课 <text class="muted small">　约 {{currentScenario.minutes}} 分钟</text></text></view><image class="product-art" :src="img(currentScenario.image)" mode="aspectFit" /></view>
        <view class="progress-track"><view :style="{width:completedIn(currentScenario)*25+'%'}" /></view>
        <button role="button" class="primary" @click="continueLearning">{{state.checkpoint?'继续练习':completedIn(currentScenario)?'继续练习':'开始练习'}}<AppIcon name="caret-right" tone="white" :size="22" /></button>
      </view>
      <view class="shortcuts">
        <button role="button" class="shortcut amber" @click="switchTab('tourist')"><image :src="img('welcome')" mode="aspectFit"/><text>模拟接待</text></button>
        <button role="button" class="shortcut blue" @click="openSay"><AppIcon name="waveform" :size="57"/><text>我想说</text></button>
        <button role="button" class="shortcut green" @click="switchTab('review')"><AppIcon name="book-open" :size="57"/><text>复习</text></button>
      </view>
      <button role="button" class="card field-task-card" @click="go('task')"><view class="section-title task-caption"><AppIcon name="clipboard-text" :size="24"/><text>今日真实任务</text></view><view class="task-body"><text>{{currentScenario.task}}</text><image :src="img('product')" mode="aspectFit" /></view></button>
      <view v-if="!state.profile.name||state.profile.name==='朋友'" class="onboarding-tip"><AppIcon name="hand-waving" :size="22"/><text @click="go('profile-edit')">先告诉我们，你平时经营什么？</text><AppIcon name="caret-right" :size="18"/></view>
    </view>

    <view v-else-if="tab==='courses'" class="main-content">
      <view class="card course-summary"><view><text class="card-title">我的学习进度</text><text class="muted">已完成 <text class="green-text strong">{{state.completed.length}} / 12</text> 个短课</text></view><AppIcon name="mountains" :size="64"/><view class="progress-track"><view :style="{width:state.completed.length/12*100+'%'}"/></view></view>
      <SectionTitle title="正在学习" />
      <view class="card current-course"><view><text class="today-title">{{currentScenario.title}}</text><text class="muted">{{currentScenario.subtitle}}</text><text class="muted">{{completedIn(currentScenario)}} / 4 课</text></view><image :src="img(currentScenario.image)" mode="aspectFit"/><button role="button" class="primary" @click="go('scenario',{scenarioId:currentScenario.id})">继续学习<AppIcon name="caret-right" tone="white" :size="22"/></button></view>
      <SectionTitle title="公共情境" />
      <view class="scene-grid"><button role="button" v-for="(s,i) in publicScenes" :key="i" class="scene-tile" :class="s.color" @click="s.future?futureNotice():openScenario(s.id)"><AppIcon :name="s.icon" :size="38"/><text>{{s.title}}</text><text v-if="s.future" class="tiny muted">后续开放</text></button></view>
      <SectionTitle title="职业内容包"/>
      <view class="occupation-grid"><button role="button" v-for="o in occupations" :key="o.id" class="occupation-card" :class="[o.future?'':'green',state.profile.occupation===o.id?'selected':'']" @click="chooseOccupation(o)"><AppIcon :name="o.icon" :size="36"/><text>{{o.title}}</text><text class="tiny muted">{{o.future?'内容核验中':'开始练习'}}</text></button></view>
    </view>

    <view v-else-if="tab==='tourist'" class="main-content">
      <SectionTitle title="选择游客角色"/>
      <view class="tourist-grid"><button role="button" v-for="t in tourists" :key="t.id" class="tourist-card" :class="[t.color,selectedTourist===t.id?'selected':'']" @click="selectedTourist=t.id"><image :src="img(t.image)" mode="aspectFill"/><text>{{t.title}}</text><view v-if="selectedTourist===t.id" class="selected-check"><AppIcon name="check" tone="white" :size="18"/></view></button></view>
      <SectionTitle title="本次练习"/>
      <button role="button" class="card scenario-choice" @click="showScenarioPicker=true"><view><text class="card-title">{{selectedScenario.title}}</text><text class="muted small">{{selectedScenario.subtitle}}</text></view><AppIcon name="caret-down"/><image :src="img(selectedScenario.image)" mode="aspectFit"/></button>
      <SectionTitle title="难度"/>
      <view class="segmented"><button role="button" v-for="(d,i) in difficulties" :key="d" :class="{active:difficulty===i}" @click="difficulty=i">{{d}}</button></view><text class="difficulty-help muted">{{['提供完整回答提示','提供图片与关键词提示','只显示问题，可主动请求帮助'][difficulty]}}</text>
      <button role="button" class="primary" @click="startDialogue()">开始模拟接待<AppIcon name="caret-right" tone="white" :size="22"/></button>
      <text class="service-note">当前使用课程库中的固定情境问答，可随时重听。</text>
    </view>

    <view v-else-if="tab==='review'" class="main-content">
      <view class="card review-today"><view class="row-between"><view><text class="card-title">今日复习</text><text class="review-number">{{reviewQueue.length}} <text class="muted body-size">{{reviewQueue.length?'项　约 '+reviewQueue.length*2+' 分钟':'项'}}</text></text></view><AppIcon name="clipboard-text" :size="74"/></view><view v-if="reviewQueue.length" class="progress-track"><view :style="{width:reviewProgress+'%'}"/></view><text class="muted small">{{reviewQueue.length?'按自己的节奏来，不会扣分':'暂时没有待复习内容，可以自选情境练习。'}}</text><button role="button" class="primary" @click="reviewQueue.length?startReview():switchTab('courses')">{{reviewQueue.length?'开始复习':'选择一个情境'}}<AppIcon name="caret-right" tone="white" :size="22"/></button></view>
      <SectionTitle title="需要加强"/>
      <view class="weak-tags"><button role="button" class="amber" @click="openCategory('listening')"><AppIcon name="waveform" tone="amber"/><text>听懂问题</text></button><button role="button" class="blue" @click="openCategory('expression')"><AppIcon name="chats-circle" tone="blue"/><text>完整表达</text></button><button role="button" class="green" @click="openCategory('real')"><AppIcon name="note"/><text>真实问题</text></button></view>
      <SectionTitle title="分类复习"/>
      <button role="button" v-for="r in reviewTypes" :key="r.id" class="list-card" @click="openCategory(r.id)"><view class="icon-square" :class="r.color"><AppIcon :name="r.icon" :tone="r.color" :size="30"/></view><view class="list-copy"><text class="list-title">{{r.title}}</text><text class="small muted">{{r.desc}}</text></view><text class="small muted">{{reviewCount(r.id)}}项</text><AppIcon name="caret-right" tone="muted" :size="18"/></button>
      <button role="button" class="secondary" @click="go('issue')"><AppIcon name="plus" :size="20"/>记下接待中遇到的新问题</button>
      <view class="quiet-note"><AppIcon name="plant" :size="22"/>复习不会扣分，按自己的节奏来</view>
    </view>

    <view v-else class="main-content profile-content">
      <view class="card profile-card"><view class="avatar green"><AppIcon name="user" :size="48"/></view><view class="profile-name"><text>{{state.profile.name}}</text><text class="small muted">{{occupationName}}</text></view><button role="button" class="mini-button" @click="go('profile-edit')"><AppIcon name="pencil-simple" :size="17"/>编辑资料</button></view>
      <SectionTitle title="我的能力"/>
      <view class="card skill-summary"><text class="card-title">一步一步，练会真实接待</text><button role="button" v-for="s in scenarios" :key="s.id" class="skill-row" @click="openScenario(s.id)"><AppIcon :name="s.icon" :size="25"/><text>{{s.title}}</text><view class="skill-track"><view :style="{width:completedIn(s)*25+'%'}"/></view><text class="badge" :class="completedIn(s)?'green':'neutral'">{{completedIn(s)===4?'已练待验证':completedIn(s)?'练习中':'未开始'}}</text></button><text class="tiny muted">课时进度与独立接待能力分别记录。</text></view>
      <SectionTitle title="累计学习"/>
      <view class="stats-grid"><view class="green"><AppIcon name="chats-circle"/><text>练习</text><text class="stat-number">{{state.attempts.length}}<text> 次</text></text></view><view class="blue"><AppIcon name="calendar" tone="blue"/><text>学习</text><text class="stat-number">{{state.learningDates.length}}<text> 天</text></text></view><view class="amber"><AppIcon name="book-open" tone="amber"/><text>完成</text><text class="stat-number">{{state.completed.length}}<text> 课</text></text></view></view>
      <SectionTitle title="内容与设置"/>
      <button role="button" v-for="m in managementLinks" :key="m.page" class="list-card" @click="go(m.page)"><view class="icon-square" :class="m.color"><AppIcon :name="m.icon" :tone="m.color" :size="28"/></view><view class="list-copy"><text class="list-title">{{m.title}}</text><text class="small muted">{{m.desc}}</text></view><AppIcon name="caret-right" tone="muted" :size="19"/></button>
      <view class="quiet-note"><AppIcon name="lock-key" :size="19"/>你的内容默认保存在本机，暂未上传</view>
    </view>
    <view class="tab-bar"><button role="button" v-for="t in tabs" :key="t.id" :class="{active:tab===t.id}" @click="switchTab(t.id)"><AppIcon :name="t.icon" :tone="tab===t.id?'green':'muted'" :size="27"/><text>{{t.title}}</text><view v-if="tab===t.id" class="tab-indicator"/></button></view>
  </view>

  <view v-else class="detail-view">
    <PageHeader :title="pageTitle" :subtitle="pageSubtitle" @back="back"/>
    <view class="detail-content">
      <template v-if="page==='scenario'">
        <view class="card scenario-hero"><image :src="img(selectedScenario.image)" mode="aspectFit"/><text class="detail-title">{{selectedScenario.title}}</text><text class="muted">{{selectedScenario.goal}}</text><view class="progress-track"><view :style="{width:completedIn(selectedScenario)*25+'%'}"/></view><text class="small muted">已完成 {{completedIn(selectedScenario)}} / 4 课</text></view>
        <SectionTitle title="四个短课，逐步开口"/>
        <button role="button" v-for="(l,i) in selectedScenario.lessons" :key="l.id" class="list-card lesson-row" @click="startLesson(l.id)"><view class="lesson-index" :class="state.completed.includes(l.id)?'green':'blue'"><AppIcon v-if="state.completed.includes(l.id)" name="check"/><text v-else>{{i+1}}</text></view><view class="list-copy"><text class="list-title">{{l.title}}</text><text class="small muted">{{l.brief}} · 约{{i===3?5:6}}分钟</text></view><AppIcon name="caret-right" :size="20"/></button>
        <view class="card"><text class="card-title">六关能力路径</text><view class="stage-path"><view v-for="(s,i) in stages" :key="s.id"><AppIcon :name="s.icon" :size="24"/><text>{{i+1}} {{s.title}}</text></view></view><text class="small muted">每个短课练习其中一部分，不用一次全部完成。</text></view>
      </template>

      <template v-else-if="page==='practice'">
        <view class="practice-progress"><text>{{stageDefinition.title}}</text><text class="muted small">本课 {{practiceStep+1}} / {{activeLesson.stages.length}}</text></view><view class="progress-track"><view :style="{width:(practiceStep+1)/activeLesson.stages.length*100+'%'}"/></view>
        <text class="practice-heading">{{stageDefinition.help}}</text>
        <image class="practice-art" :src="img(selectedScenario.image)" mode="aspectFit"/>
        <view v-if="stageDefinition.id==='listen'" class="card question-card"><text class="eyebrow">游客问</text><text class="spoken-sentence">{{activeLesson.question}}</text><view class="audio-actions"><button role="button" @click="playText(activeLesson.question)"><AppIcon name="speaker-high"/>听问题</button><button role="button" @click="playText(activeLesson.question,true)"><AppIcon name="gauge"/>慢一点</button></view><text v-if="activeLesson.note" class="tiny muted">{{activeLesson.note}}</text></view>
        <view v-else-if="stageDefinition.id==='keywords'" class="word-grid"><button role="button" v-for="w in selectedScenario.words" :key="w" @click="playText(w)"><AppIcon name="speaker-high"/><text>{{w}}</text></button></view>
        <view v-else class="card question-card"><text class="eyebrow">{{stageDefinition.id==='challenge'?'这次要说清':'先听示范'}}</text><text v-if="stageDefinition.id==='challenge'" class="spoken-sentence">{{activeLesson.question}}</text><template v-else><text v-if="hintLevel===2" class="spoken-sentence">{{activeLesson.sentence}}</text><view v-else-if="hintLevel===1" class="word-hints"><text v-for="w in selectedScenario.words" :key="w">{{w}}</text></view><text v-else class="spoken-sentence">看着图片，试着自己介绍。</text><view class="audio-actions"><button role="button" @click="playText(activeLesson.sentence)"><AppIcon name="speaker-high"/>听示范</button><button role="button" @click="playText(activeLesson.sentence,true)"><AppIcon name="gauge"/>慢一点</button></view></template><text v-if="stageDefinition.id==='challenge'" class="small muted">{{selectedScenario.facts.join('、')}}。仅使用自己确认的信息。</text></view>
        <template v-if="stageDefinition.id==='listen'"><text class="small muted">游客想了解什么？</text><button role="button" v-for="(answer,i) in activeLesson.choices" :key="i" class="answer-option" :class="{chosen:answerChoice===i,correct:answerSubmitted&&i===activeLesson.answer}" @click="!answerSubmitted&&(answerChoice=i)">{{answer}}<AppIcon v-if="answerSubmitted&&i===activeLesson.answer" name="check"/></button><view v-if="answerSubmitted" class="feedback-message" :class="answerChoice===activeLesson.answer?'green':'amber'">{{answerChoice===activeLesson.answer?'听懂了，继续练习关键词。':'这次是在问“'+activeLesson.choices[activeLesson.answer]+'”，可以再听一次。'}}</view><button role="button" class="primary" :disabled="answerChoice===null" @click="answerSubmitted?nextPractice():checkAnswer()">{{answerSubmitted?'继续':'确认答案'}}</button></template>
        <template v-else>
          <view v-if="stageDefinition.id==='retell'" class="hint-control"><text class="small muted">提示</text><button role="button" v-for="(h,i) in ['仅看图','关键词','完整示范']" :key="h" :class="{chosen:hintLevel===i}" @click="hintLevel=i">{{h}}</button></view>
          <view class="recorder"><button role="button" class="record-button" :disabled="recordStarting" :class="{recording}" @click="toggleRecord"><AppIcon :name="recording?'stop':'microphone'" tone="white" :size="34"/><text>{{recording?'点击结束':recordStarting?'正在打开':'点击开始说'}}</text></button><text class="record-time">{{recording?formatTime(recordSeconds):lastRecording?'录音已保存在本机':'说完后，再点一次结束'}}</text></view>
          <button role="button" v-if="lastRecording" class="secondary" @click="playSaved(lastRecording)"><AppIcon name="play"/>听我的录音</button>
          <view v-if="lastRecording" class="feedback-message blue"><text>录音已保存，可以对照示范回听。</text><text class="small">语音分析尚未连接，本次不生成AI分数或掌握结论。</text></view>
          <button role="button" class="primary" :disabled="recording" @click="finishSpoken">{{lastRecording?'保存并继续':'我已开口练习，继续'}}</button><text class="service-note">手动完成仅记为练习记录，独立接待能力需要进一步验证。</text>
        </template>
      </template>

      <template v-else-if="page==='lesson-result'">
        <view class="completion-head"><view class="completion-icon green"><AppIcon name="check" :size="42"/></view><text class="detail-title">今天又练会了一点</text><text class="muted">{{activeLesson.title}} · 已记录本次练习</text></view><view class="card"><text class="card-title">这次练习了</text><view v-for="s in activeLesson.stages" :key="s" class="list-line"><AppIcon :name="stageById(s).icon"/><text>{{stageById(s).title}}</text><text class="badge green">已练习</text></view><text class="small muted">发音与独立表达的效果，需在回听或真人理解测试中确认。</text></view><button role="button" class="primary" @click="startNextLesson">{{nextLesson?'继续下一课':'查看真实经营任务'}}</button><button role="button" class="secondary" @click="switchTab('home')">今天先练到这里</button>
      </template>

      <template v-else-if="page==='dialogue'">
        <view class="dialogue-meta"><view class="avatar-small"><image :src="img(selectedRole.image)" mode="aspectFill"/></view><view><text class="strong">{{selectedRole.title}}</text><text class="small muted">{{selectedScenario.title}} · {{difficulties[difficulty]}}</text></view><text class="badge blue">{{dialogueIndex+1}} / {{dialogueQuestions.length}}</text></view><view class="card visitor-question"><text class="eyebrow">游客问</text><text class="spoken-sentence">{{dialogueQuestions[dialogueIndex]}}</text><view class="audio-actions"><button role="button" @click="playText(dialogueQuestions[dialogueIndex])"><AppIcon name="speaker-high"/>再听一次</button><button role="button" @click="playText(dialogueQuestions[dialogueIndex],true)"><AppIcon name="gauge"/>慢一点</button></view></view><view v-if="difficulty<2||showHelp" class="card green"><text class="eyebrow">{{difficulty===0?'回答提示':'关键词提示'}}</text><text class="body-copy">{{difficulty===0?'按你确认的真实情况，回应游客想了解的信息。':selectedScenario.facts.join('　')}}</text></view><view class="recorder"><button role="button" class="record-button" :disabled="recordStarting" :class="{recording}" @click="toggleRecord"><AppIcon :name="recording?'stop':'microphone'" tone="white" :size="34"/><text>{{recording?'点击结束':recordStarting?'正在打开':'开始回答'}}</text></button><text class="record-time">{{recording?formatTime(recordSeconds):lastRecording?'本次回答已保存':'可以录音，也可以先自己说一遍'}}</text></view><button role="button" v-if="lastRecording" class="secondary" @click="playSaved(lastRecording)">回听这次回答</button><button role="button" class="primary" :disabled="recording" @click="nextDialogue">{{dialogueIndex===dialogueQuestions.length-1?'完成这轮接待':'我已回答，继续'}}</button><button role="button" class="text-button" @click="showHelp=!showHelp">{{showHelp?'收起提示':'我需要一点提示'}}</button><text class="service-note">课程固定问答，不会把手动完成视为AI已听懂。</text>
      </template>

      <template v-else-if="page==='recap'">
        <view class="completion-head"><view class="completion-icon green"><AppIcon name="chats-circle" :size="42"/></view><text class="detail-title">完成了一轮接待练习</text><text class="muted">共练习 {{dialogueQuestions.length}} 个问题</text></view><view class="card"><text class="card-title">游客提到的问题</text><view v-for="(q,i) in dialogueQuestions" :key="q" class="recap-item"><text>{{i+1}}. {{q}}</text><text class="small muted">{{dialogueAnswers[i]?'回答录音已保存，可回听':'已手动记录练习'}}</text><button role="button" v-if="dialogueAnswers[i]" class="mini-button" @click="playSaved(dialogueAnswers[i])">回听</button><button role="button" class="mini-button" @click="addDialogueReview(q)">加入复习</button></view><text class="small muted">录音和手动记录用于复盘，当前没有AI评价结论。</text></view><button role="button" class="primary" @click="go('task')">试试真实经营任务</button><button role="button" class="secondary" @click="switchTab('tourist')">再练一轮</button>
      </template>

      <template v-else-if="page==='say'">
        <text class="detail-title">想向游客介绍什么？</text><text class="muted">用熟悉的语言记录，再核对重要信息。</text><view class="card say-card"><text class="body-copy">自家的商品、制作方法，<br/>或上次没说出来的话。</text><view class="recorder"><button role="button" class="record-button" :disabled="recordStarting" :class="{recording}" @click="toggleRecord"><AppIcon :name="recording?'stop':'microphone'" tone="white" :size="34"/><text>{{recording?'点击结束':recordStarting?'正在打开':'录下想说的话'}}</text></button><text class="record-time">{{recording?formatTime(recordSeconds):lastRecording?'录音已保存':'只在你主动开始后采集声音'}}</text></view><button role="button" v-if="lastRecording" class="secondary" @click="playSaved(lastRecording)">听一听录音</button></view><view class="two-column"><button role="button" class="secondary" @click="choosePhoto"><AppIcon name="camera"/>拍照或选图</button><button role="button" class="secondary" @click="go('issue')"><AppIcon name="note"/>记录问题</button></view><image v-if="photoPath" class="user-photo" :src="photoPath" mode="aspectFit"/><view class="feedback-message blue"><text class="small">录音保存在本机，图片仅辅助本次核对，不会解析或上传。请自行补充事实，或请熟悉双语的家人协助填写。</text></view><button role="button" class="primary" :disabled="recording" @click="go('facts')">核对要介绍的信息<AppIcon name="caret-right" tone="white" :size="20"/></button><button role="button" class="text-button" @click="saveDraft">保存草稿，下次继续</button>
      </template>

      <template v-else-if="page==='facts'">
        <text class="detail-title">先确认自己的经营信息</text><text class="muted small">不知道的可以留空，不会自动补成事实。</text><view class="card form-card"><label class="field-label">商品或服务名称 <text class="required">必填</text></label><input v-model="facts.name" aria-label="商品或服务名称" maxlength="30" placeholder="例如：自家的手工商品"/><label class="field-label">主要材料</label><input v-model="facts.material" aria-label="主要材料" maxlength="80" placeholder="只填写你确认的材料"/><label class="field-label">制作方法</label><textarea v-model="facts.process" aria-label="制作方法" maxlength="200" placeholder="用自己的话写两三步，也可以请家人协助"/><view class="two-column"><view><label class="field-label">价格（元）</label><input v-model="facts.price" aria-label="价格（元）" type="digit" placeholder="可不填"/></view><view><label class="field-label">计价单位</label><input v-model="facts.unit" aria-label="计价单位" maxlength="12" placeholder="例如：每份"/></view></view></view><view class="feedback-message amber"><text class="small">文化、宗教、历史及健康结论需专业审核。当前个人表达卡只整理一般经营介绍。</text></view><button role="button" class="primary" :disabled="!facts.name.trim()" @click="generatePersonal">信息确认，整理成表达</button>
      </template>

      <template v-else-if="page==='personal-card'">
        <view class="card"><view class="row-between"><text class="detail-title">{{activePersonal?.title}}</text><text class="badge green">本人已确认</text></view><text class="small muted">来源：本人描述与模板整理 · 仅本机可见</text><view class="segmented"><button role="button" :class="{active:personalVersion==='short'}" @click="personalVersion='short'">简短版</button><button role="button" :class="{active:personalVersion==='full'}" @click="personalVersion='full'">完整版</button></view><text class="spoken-sentence personal-expression">{{activePersonal?.[personalVersion]}}</text><button role="button" class="secondary" @click="playText(activePersonal?.[personalVersion])"><AppIcon name="speaker-high"/>听一听表达</button></view><SectionTitle title="游客可能会问"/><view class="card"><view v-for="q in activePersonal?.questions" :key="q" class="list-line"><AppIcon name="question"/><text>{{q}}</text></view></view><button role="button" class="primary" @click="practicePersonal">开始练习这张情境卡</button><button role="button" class="secondary" @click="go('personal-list')">回到我的课程</button><button role="button" class="text-button danger-text" @click="deletePersonal">删除这张情境卡</button>
      </template>

      <template v-else-if="page==='personal-list'">
        <view v-if="!state.personal.length&&!state.drafts.length" class="empty-state"><AppIcon name="book-open" :size="64"/><text class="card-title">还没有自己的情境卡</text><text class="muted">把想介绍的内容留下来，慢慢练会。</text></view><button role="button" v-for="p in state.personal" :key="p.id" class="list-card" @click="activePersonalId=p.id;go('personal-card')"><view class="icon-square green"><AppIcon name="book-open"/></view><view class="list-copy"><text class="list-title">{{p.title}}</text><text class="small muted">本人已确认 · 仅自己可见</text></view><AppIcon name="caret-right"/></button><view v-if="state.drafts.length" class="card"><text class="card-title">未完成的草稿</text><button role="button" v-for="d in state.drafts" :key="d.id" class="list-line" @click="restoreDraft(d)"><AppIcon name="note"/><text>{{d.name||'未命名的表达'}}</text><text class="small muted">继续整理</text></button></view><button role="button" class="primary" @click="openSay">添加自己的表达</button>
      </template>

      <template v-else-if="page==='review-list'">
        <view v-if="!categoryItems.length" class="empty-state"><AppIcon name="plant" :size="64"/><text class="card-title">这一类暂时没有待练内容</text><text class="muted">有新的接待问题，随时可以记下来。</text></view><view v-for="r in categoryItems" :key="r.id" class="card review-item"><text class="card-title">{{r.title}}</text><text class="muted small">{{r.reason}}</text><view class="two-column"><button role="button" class="secondary" @click="playText(r.title)">听一听</button><button role="button" class="primary" @click="finishReview(r)">已复习</button></view></view><button role="button" class="secondary" @click="go('issue')">记录新问题</button>
      </template>

      <template v-else-if="page==='review-session'">
        <view v-if="reviewSessionItems.length" class="card"><text class="eyebrow">本次复习 {{reviewDone+1}} / {{reviewStartCount}}</text><text class="spoken-sentence">{{reviewSessionItems[0].title}}</text><text class="muted">{{reviewSessionItems[0].reason}}</text><button role="button" class="secondary" @click="playText(reviewSessionItems[0].title)">听一遍问题</button><text class="body-copy review-prompt">先想一想，再自己说一遍。需要时可以看关键词。</text><button role="button" class="primary" @click="finishReview(reviewSessionItems[0]);reviewDone++">我已练习，下一项</button></view><view v-else class="completion-head"><view class="completion-icon green"><AppIcon name="check" :size="40"/></view><text class="detail-title">本次复习完成了</text><text class="muted">已记录 {{reviewDone}} 项复习，下次再慢慢练。</text><button role="button" class="primary" @click="switchTab('review')">回到复习首页</button></view>
      </template>

      <template v-else-if="page==='issue'">
        <text class="detail-title">把没说出的话记下来</text><text class="muted">接待后自己描述即可，不需要录下游客。</text><view class="card"><label class="field-label">这次遇到了什么问题？</label><textarea v-model="issueText" aria-label="这次遇到了什么问题" maxlength="200" placeholder="例如：游客问怎么制作，我不知道该怎么回答。"/><view class="recorder"><button role="button" class="record-button small-record" :disabled="recordStarting" :class="{recording}" @click="toggleRecord"><AppIcon :name="recording?'stop':'microphone'" tone="white"/><text>{{recording?'点击结束':recordStarting?'正在打开':'口述记录'}}</text></button><text class="record-time">{{lastRecording?'录音已保存，可在录音与隐私中回听':'也可以请家人协助补充简短说明'}}</text></view></view><button role="button" class="primary" :disabled="!issueText.trim()&&!lastRecording" @click="saveIssue">加入下次复习</button>
      </template>

      <template v-else-if="page==='task'">
        <view class="card field-task-detail"><AppIcon name="clipboard-text" :size="55"/><text class="detail-title">在真实接待中试一试</text><text class="spoken-sentence">{{selectedScenario.task}}</text><text class="muted">有机会就试试，没机会也没关系。</text></view><button role="button" class="primary" @click="go('reflection')">接待后，记录这次情况</button><button role="button" class="secondary" @click="switchTab('home')">稍后再记录</button>
      </template>

      <template v-else-if="page==='reflection'">
        <text class="detail-title">这次接待怎么样？</text><text class="muted">按实际情况选择，不会扣分。</text><button role="button" v-for="(r,i) in reflections" :key="r" class="answer-option" :class="{chosen:reflectionChoice===i}" @click="reflectionChoice=i">{{r}}<AppIcon v-if="reflectionChoice===i" name="check"/></button><button role="button" class="primary" :disabled="reflectionChoice===null" @click="saveReflection">保存结果</button>
      </template>

      <template v-else-if="page==='profile-edit'">
        <view class="card form-card"><label class="field-label">怎么称呼你？</label><input v-model="editProfile.name" aria-label="你的称呼" maxlength="16" placeholder="你的称呼"/><label class="field-label">你平时经营什么？</label><view class="choice-chips"><button role="button" v-for="o in occupations" :key="o.id" :class="{chosen:editProfile.occupation===o.id}" @click="editProfile.occupation=o.id">{{o.title}}</button></view><label class="field-label">试点地区（可不填）</label><input v-model="editProfile.region" aria-label="试点地区" maxlength="40" placeholder="村落或景区周边社区"/><label class="field-label">辅助语言</label><text class="body-copy">普通话慢速</text><text class="small muted">地区母语内容核对后再开放，不自动指定藏语变体。</text></view><button role="button" class="primary" @click="saveProfile">保存资料</button>
      </template>

      <template v-else-if="page==='offline'">
        <view class="feedback-message green"><AppIcon name="check-circle"/><text>基础课程已随应用内置，可离线打开文字与图片。</text></view><view v-for="s in scenarios" :key="s.id" class="card offline-card"><AppIcon :name="s.icon" :size="34"/><view><text class="card-title">{{s.title}}</text><text class="small muted">4个短课 · 内容版本1.0 · 已内置</text></view><text class="badge green">可离线</text></view><view class="card"><text class="card-title">离线时可以做什么</text><view class="list-line">浏览课程、看图、自行开口与保存录音</view><view class="list-line">查看个人情境卡和已有学习进度</view><text class="muted small">浏览器示范声音取决于设备语音包；小程序音频示范需后续接入经过审核的音频文件。实时AI分析需要联网服务。</text></view>
      </template>

      <template v-else-if="page==='privacy'">
        <view class="card"><text class="card-title">你来决定声音怎么用</text><text class="body-copy">只在点击开始后录音。当前录音保存在本机，未上传到云端。</text><text class="small muted">删除后无法在本机找回，对应练习记录保留。</text></view><SectionTitle :title="'我的录音 · '+state.recordings.length+'条'"/><view v-if="!state.recordings.length" class="empty-state"><AppIcon name="microphone" :size="48"/><text class="muted">还没有保存的录音</text></view><view v-for="r in state.recordings" :key="r.id" class="card recording-row"><text class="strong">{{r.title}}</text><text class="small muted">{{r.date}} · {{r.duration}}秒 · 仅本机</text><view class="two-column"><button role="button" class="secondary" @click="playSaved(r)"><AppIcon name="play"/>回听</button><button role="button" class="secondary danger-text" @click="confirmDeleteRecording(r)"><AppIcon name="trash" tone="muted"/>删除</button></view></view>
      </template>

      <template v-else-if="page==='settings'">
        <view class="card"><view class="setting-row"><view><text class="list-title">大字号</text><text class="small muted">让正文和操作更容易看清</text></view><button role="switch" aria-label="大字号" :aria-checked="state.settings.largeText" class="mini-button setting-toggle" :class="state.settings.largeText?'green':'neutral'" @click="state.settings.largeText=!state.settings.largeText;persist()">{{state.settings.largeText?'已开启':'开启'}}</button></view><view class="setting-row"><view><text class="list-title">示范声音</text><text class="small muted">由你主动点击播放</text></view><button role="switch" aria-label="示范声音" :aria-checked="state.settings.voice" class="mini-button setting-toggle" :class="state.settings.voice?'green':'neutral'" @click="state.settings.voice=!state.settings.voice;persist()">{{state.settings.voice?'已开启':'开启'}}</button></view></view><view class="card"><text class="card-title">关于开口迎客</text><text class="body-copy">围绕真实旅游接待练习普通话，关注游客能否听懂，不以消除口音为目标。</text><text class="small muted">课程基于项目需求文档V2.0，首期内容版本1.0。</text></view><view class="card"><text class="card-title">当前服务范围</text><text class="body-copy">课程、固定问答、个人表达整理和本机记录可用。真实AI评价、地区母语示范、账号云同步与人工审核尚未连接。</text></view>
      </template>
    </view>
  </view>

  <view v-if="showScenarioPicker" class="sheet-mask" @click="showScenarioPicker=false"><view class="bottom-sheet" @click.stop><text class="card-title">选择本次练习情境</text><button role="button" v-for="s in scenarios" :key="s.id" class="list-card" @click="selectedScenarioId=s.id;showScenarioPicker=false"><AppIcon :name="s.icon"/><text>{{s.title}}</text><AppIcon v-if="selectedScenarioId===s.id" name="check"/></button><button role="button" class="secondary" @click="showScenarioPicker=false">返回</button></view></view>
</view>
</template>

<script setup>
import {ref,computed,onUnmounted} from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import PageHeader from '../../components/PageHeader.vue'
import SectionTitle from '../../components/SectionTitle.vue'
import {state,persist,markComplete,queueReview,savePersonal,removeRecording,uid,localDay} from '../../store'
import {scenarios,stages,publicScenes,occupations,tourists,reviewTypes,reflections,getScenario,getLesson,getDialogueQuestions} from '../../data/library'
import {startRecording,stopRecording,storeAudio,playRecording,deleteAudio,speak,stopPlayback,onInterrupted} from '../../services/audio'
const tab=ref('home'),page=ref('main'),history=ref([]),selectedScenarioId=ref(state.currentScenario),selectedTourist=ref('curious'),difficulty=ref(1),showScenarioPicker=ref(false)
const lessonId=ref(state.checkpoint?.lessonId||'product-1'),practiceStep=ref(state.checkpoint?.step||0),answerChoice=ref(null),answerSubmitted=ref(false),hintLevel=ref(2),recording=ref(false),recordStarting=ref(false),recordSeconds=ref(0),lastRecordingId=ref(null),showHelp=ref(false),dialogueIndex=ref(0),dialogueAnswers=ref([]),personalDialogue=ref(false),dialogueFromLesson=ref(false),reviewSessionIds=ref([]),reviewCategory=ref('all'),reviewDone=ref(0),reviewStartCount=ref(0),photoPath=ref(''),issueText=ref(''),reflectionChoice=ref(null),activePersonalId=ref(null),personalVersion=ref('short')
const facts=ref({name:'',material:'',process:'',price:'',unit:''}),editProfile=ref({...state.profile})
let recordTimer,autoRecordTimer,cancelPendingRecord=false
let statusGap=0
// #ifndef H5
statusGap=uni.getSystemInfoSync().statusBarHeight||24
// #endif
const img=name=>'/static/images/'+name+'.jpg'
const tabs=[{id:'home',title:'首页',icon:'house'},{id:'courses',title:'课程',icon:'book-open'},{id:'tourist',title:'AI游客',icon:'user-circle'},{id:'review',title:'复习',icon:'note'},{id:'me',title:'我的',icon:'user'}]
const difficulties=['初级','中级','高级']
const isMain=computed(()=>page.value==='main')
const currentScenario=computed(()=>getScenario(state.currentScenario))
const selectedScenario=computed(()=>getScenario(selectedScenarioId.value))
const selectedRole=computed(()=>tourists.find(t=>t.id===selectedTourist.value)||tourists[0])
const activeLesson=computed(()=>getLesson(lessonId.value))
const stageDefinition=computed(()=>stages.find(s=>s.id===activeLesson.value.stages[practiceStep.value])||stages[0])
const lastRecording=computed(()=>state.recordings.find(r=>r.id===lastRecordingId.value))
const activePersonal=computed(()=>state.personal.find(p=>p.id===activePersonalId.value))
const nextLesson=computed(()=>{const list=selectedScenario.value.lessons;return list[list.findIndex(l=>l.id===lessonId.value)+1]})
const reviewQueue=computed(()=>state.reviews.filter(r=>!r.done).slice(0,5))
const reviewSessionItems=computed(()=>state.reviews.filter(r=>reviewSessionIds.value.includes(r.id)&&!r.done))
const categoryItems=computed(()=>state.reviews.filter(r=>!r.done&&(reviewCategory.value==='all'||r.type===reviewCategory.value)))
const reviewProgress=computed(()=>state.reviews.length?state.reviews.filter(r=>r.done).length/state.reviews.length*100:0)
const dialogueQuestions=computed(()=>personalDialogue.value&&activePersonal.value?activePersonal.value.questions:getDialogueQuestions(selectedScenarioId.value,selectedTourist.value))
const occupationName=computed(()=>(occupations.find(o=>o.id===state.profile.occupation)?.title||'特色商品')+'经营者')
const managementLinks=computed(()=>[{page:'personal-list',title:'我的课程',desc:`${state.personal.length}张个人情境卡`,icon:'book-open',color:'green'},{page:'offline',title:'离线内容',desc:'基础课程和图片已内置',icon:'download-simple',color:'blue'},{page:'privacy',title:'录音与隐私',desc:`管理${state.recordings.length}条录音`,icon:'microphone',color:'amber'},{page:'settings',title:'帮助与设置',desc:'字号、声音和使用帮助',icon:'gear',color:'blue'}])
const tabTitle=computed(()=>{if(tab.value==='home'){const h=new Date().getHours();return state.profile.name+'，'+(h<12?'上午好':h<18?'下午好':'晚上好')}return {courses:'情境课程',tourist:'AI游客',review:'复习',me:'我的'}[tab.value]})
const tabSubtitle=computed(()=>({home:'继续练习，让更多游客\n听见家乡的美好。',courses:'选择你想练习的接待场景',tourist:'选择一位游客，练习真实接待',review:'今天只练最需要加强的内容',me:'慢慢练，把熟悉的事亲口说出来'}[tab.value]))
const titles={'scenario':'情境课程','practice':'情境练习','lesson-result':'本课完成','dialogue':'模拟接待','recap':'接待复盘','say':'我想说','facts':'核对信息','personal-card':'我的情境卡','personal-list':'我的课程','review-list':'分类复习','review-session':'今日复习','issue':'记录真实问题','task':'真实经营任务','reflection':'接待后记录','profile-edit':'编辑资料','offline':'离线内容','privacy':'录音与隐私','settings':'帮助与设置'}
const pageTitle=computed(()=>titles[page.value]||'开口迎客')
const pageSubtitle=computed(()=>page.value==='practice'?activeLesson.value.title:'')
function toast(title){uni.showToast({title,icon:'none',duration:2600})}
function completedIn(s){return s.lessons.filter(l=>state.completed.includes(l.id)).length}
function stageById(id){return stages.find(s=>s.id===id)||stages[0]}
function scrollTop(){uni.pageScrollTo({scrollTop:0,duration:0})}
async function beforeNavigate(){stopPlayback();if(recordStarting.value)cancelPendingRecord=true;if(recording.value)await endRecord()}
async function go(next,params={}){await beforeNavigate();history.value.push({page:page.value,scenarioId:selectedScenarioId.value});if(params.scenarioId)selectedScenarioId.value=params.scenarioId;page.value=next;if(next==='profile-edit')editProfile.value={...state.profile};if(next==='issue'){lastRecordingId.value=null;issueText.value=''};scrollTop()}
async function back(){await beforeNavigate();const prev=history.value.pop();page.value=prev?.page||'main';if(prev?.scenarioId)selectedScenarioId.value=prev.scenarioId;scrollTop()}
async function switchTab(id){await beforeNavigate();page.value='main';tab.value=id;history.value=[];selectedScenarioId.value=state.currentScenario;scrollTop()}
function openScenario(id){go('scenario',{scenarioId:id})}
function futureNotice(){toast('这一情境还在核对内容，先练已开放的课程。')}
function chooseOccupation(o){if(o.future)return futureNotice();state.profile.occupation=o.id;state.currentScenario='product';persist();openScenario('product')}
function continueLearning(){if(state.checkpoint){lessonId.value=state.checkpoint.lessonId;practiceStep.value=state.checkpoint.step;selectedScenarioId.value=scenarios.find(s=>s.lessons.some(l=>l.id===lessonId.value)).id;resetPractice();go('practice')}else{const l=currentScenario.value.lessons.find(l=>!state.completed.includes(l.id))||currentScenario.value.lessons[0];startLesson(l.id)}}
function resetPractice(){answerChoice.value=null;answerSubmitted.value=false;lastRecordingId.value=null;hintLevel.value=2}
function startLesson(id){lessonId.value=id;practiceStep.value=0;selectedScenarioId.value=scenarios.find(s=>s.lessons.some(l=>l.id===id)).id;state.currentScenario=selectedScenarioId.value;resetPractice();saveCheckpoint();if(stageDefinition.value.id==='dialogue')startDialogue(true);else go('practice')}
function saveCheckpoint(){state.checkpoint={lessonId:lessonId.value,step:practiceStep.value};persist()}
function checkAnswer(){answerSubmitted.value=true;state.attempts.push({id:uid('a'),type:'listening',lessonId:lessonId.value,correct:answerChoice.value===activeLesson.value.answer,date:localDay()});if(answerChoice.value!==activeLesson.value.answer)queueReview({target:lessonId.value,type:'listening',title:activeLesson.value.question,reason:'这道游客意图题需要再听一听'});persist()}
function nextPractice(){if(practiceStep.value<activeLesson.value.stages.length-1){practiceStep.value++;resetPractice();saveCheckpoint();scrollTop()}else finishLesson()}
function finishLesson(){markComplete(lessonId.value);page.value='lesson-result';scrollTop()}
function finishSpoken(){state.attempts.push({id:uid('a'),type:stageDefinition.value.id,lessonId:lessonId.value,recordingId:lastRecordingId.value,hint:hintLevel.value,source:'self_report',date:localDay()});persist();nextPractice()}
function startNextLesson(){if(nextLesson.value)startLesson(nextLesson.value.id);else go('task')}
function playText(text,slow=false){if(!state.settings.voice)return toast('示范声音已关闭，可在帮助与设置中开启。');if(!speak(text,slow))toast('当前设备未提供这段示范音频，可先看句子练习。')}
async function toggleRecord(){
 if(recordStarting.value)return
 if(recording.value)return endRecord()
 recordStarting.value=true;cancelPendingRecord=false
 try{lastRecordingId.value=null;await startRecording();if(cancelPendingRecord){const audio=await stopRecording();if(audio)await deleteAudio({id:'cancelled',path:audio.path});return}recordSeconds.value=0;recording.value=true;recordTimer=setInterval(()=>recordSeconds.value++,1000);autoRecordTimer=setTimeout(()=>endRecord(),59000)}catch(e){toast(e.message||'没有开启麦克风，可以先听示范。')}finally{recordStarting.value=false}
}
async function endRecord(){if(!recording.value)return;clearInterval(recordTimer);clearTimeout(autoRecordTimer);recording.value=false;try{const audio=await stopRecording();if(!audio)return;const id=uid('audio');await storeAudio(id,audio);const r={id,path:audio.path,title:page.value==='say'?'我想说的内容':page.value==='issue'?'接待问题记录':page.value==='dialogue'?'游客应答':activeLesson.value.title,duration:Math.max(recordSeconds.value,1),date:localDay()};state.recordings.unshift(r);lastRecordingId.value=id;persist()}catch(e){toast('录音未能保存，请检查本机空间后重试。')}}
async function playSaved(r){try{await playRecording(r)}catch(e){toast(e.message||'这条录音暂时无法播放。')}}
function startDialogue(fromCourse=false){fromCourse=fromCourse===true;dialogueFromLesson.value=fromCourse;personalDialogue.value=false;dialogueIndex.value=0;dialogueAnswers.value=[];showHelp.value=false;lastRecordingId.value=null;if(!fromCourse)selectedScenarioId.value=selectedScenarioId.value||state.currentScenario;go('dialogue')}
function nextDialogue(){dialogueAnswers.value.push(lastRecordingId.value||null);lastRecordingId.value=null;state.attempts.push({id:uid('a'),type:'dialogue',source:'self_report',scenarioId:selectedScenarioId.value,date:localDay()});persist();if(dialogueIndex.value<dialogueQuestions.value.length-1){dialogueIndex.value++;showHelp.value=false;scrollTop()}else{if(dialogueFromLesson.value&&activeLesson.value.stages.includes('dialogue')&&state.checkpoint)markComplete(lessonId.value);page.value='recap';scrollTop()}}
function addDialogueReview(q){queueReview({target:selectedScenarioId.value+q,type:'expression',title:q,reason:'来自本次游客模拟'});toast('已加入复习')}
function openSay(){facts.value={name:'',material:'',process:'',price:'',unit:''};photoPath.value='';lastRecordingId.value=null;go('say')}
function choosePhoto(){uni.chooseImage({count:1,sizeType:['compressed'],success:r=>{photoPath.value=r.tempFilePaths[0]}})}
function saveDraft(){state.drafts.unshift({id:uid('d'),...facts.value,recordingId:lastRecordingId.value});persist();toast('草稿已保存');switchTab('home')}
function restoreDraft(d){facts.value={name:d.name||'',material:d.material||'',process:d.process||'',price:d.price||'',unit:d.unit||''};lastRecordingId.value=d.recordingId;go('facts')}
function generatePersonal(){if(facts.value.price&&!facts.value.unit)return toast('填写了价格后，还需要确认计价单位。');try{const c=savePersonal(facts.value);activePersonalId.value=c.id;personalVersion.value='short';go('personal-card')}catch(e){toast(e.message)}}
function practicePersonal(){dialogueFromLesson.value=false;personalDialogue.value=true;dialogueIndex.value=0;dialogueAnswers.value=[];lastRecordingId.value=null;go('dialogue')}
function deletePersonal(){uni.showModal({title:'删除这张情境卡？',content:'这张卡会从本机删除。已保存的录音可在录音与隐私中单独管理。',confirmColor:'#237a59',success:r=>{if(r.confirm){state.personal=state.personal.filter(p=>p.id!==activePersonalId.value);persist();page.value='personal-list'}}})}
function reviewCount(type){return state.reviews.filter(r=>!r.done&&r.type===type).length}
function openCategory(type){reviewCategory.value=type;go('review-list')}
function startReview(){reviewSessionIds.value=reviewQueue.value.map(r=>r.id);reviewStartCount.value=reviewQueue.value.length;reviewDone.value=0;go('review-session')}
function finishReview(r){r.done=true;r.completedAt=localDay();persist();toast('已记录本次复习')}
function saveIssue(){queueReview({target:uid('issue'),type:'real',title:issueText.value.trim()||'回听接待后记录的问题',reason:'来自你的真实接待记录',recordingId:lastRecordingId.value});issueText.value='';lastRecordingId.value=null;toast('已加入下次复习');switchTab('review')}
function saveReflection(){state.reflections.push({id:uid('f'),scenarioId:selectedScenarioId.value,result:reflections[reflectionChoice.value],date:localDay()});persist();const needIssue=reflectionChoice.value===4;reflectionChoice.value=null;toast('接待记录已保存');if(needIssue)go('issue');else switchTab('home')}
function saveProfile(){state.profile={...editProfile.value,name:editProfile.value.name.trim()||'朋友'};persist();toast('资料已保存');switchTab('me')}
function confirmDeleteRecording(r){uni.showModal({title:'删除本机录音？',content:'录音删除后无法找回，学习进度会保留。这条录音未上传。',confirmColor:'#237a59',success:async result=>{if(result.confirm){try{await deleteAudio(r);removeRecording(r.id);toast('本机录音已删除')}catch{toast('没有删除成功，请稍后再试。')}}}})}
function formatTime(s){return '00:'+String(s).padStart(2,'0')}
onInterrupted(()=>{if(recording.value)endRecord()})
uni.$on('app-hidden',()=>{if(recording.value)endRecord();stopPlayback()})
// #ifdef H5
const hide=()=>{if(document.hidden){if(recording.value)endRecord();stopPlayback()}}
document.addEventListener('visibilitychange',hide)
// #endif
onUnmounted(()=>{clearInterval(recordTimer);clearTimeout(autoRecordTimer);stopPlayback();uni.$off('app-hidden');
// #ifdef H5
document.removeEventListener('visibilitychange',hide)
// #endif
})
</script>
