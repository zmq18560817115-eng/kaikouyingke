<template><image class="app-icon" :src="'/static/icons/'+name+'-'+tone+'.png'" mode="aspectFit" :style="{width:size+'px',height:size+'px'}" aria-hidden="true" /></template>
<script setup>
defineProps({name:{type:String,default:'chats-circle'},tone:{type:String,default:'green'},size:{type:Number,default:26}})
</script>
