// Local only. Existing progress belongs to the original default profile.
export const profilesKey='fudool-profiles-v1',activeKey='fudool-active-profile-v1';
export const avatars=['lumaa','robot','mishal','brand'];
export function read(key){try{return JSON.parse(localStorage.getItem(key))}catch{return null}}
export function profiles(){const rows=read(profilesKey);return [{id:'default',name:'',avatar:'brand',age:'all'},...(Array.isArray(rows)?rows.filter(p=>p&&typeof p.id==='string'&&/^p-[a-z0-9-]+$/.test(p.id)&&typeof p.name==='string'&&avatars.includes(p.avatar)):[])]}
export function activeProfile(){let id;try{id=localStorage.getItem(activeKey)}catch{}return profiles().find(p=>p.id===id)||profiles()[0]}
export function prefix(id=activeProfile().id){return id==='default'?'fudool-games-v1:':'fudool-profile-v1:'+id+':game:'}
export function switchProfile(id){if(!profiles().some(p=>p.id===id))throw Error('unknown profile');localStorage.setItem(activeKey,id)}
export function addProfile(name,avatar,age){const all=profiles().filter(p=>p.id!=='default');if(all.length>=5)throw Error('limit');name=name.trim().slice(0,20);if(!name||!avatars.includes(avatar)||!['all','3-5','6-7','8-10'].includes(age))throw Error('invalid');const id='p-'+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));const p={id,name,avatar,age};localStorage.setItem(profilesKey,JSON.stringify([...all,p]));switchProfile(id);return p}
export function scoresFor(id,count,profile=activeProfile().id){const state=read(prefix(profile)+id)||{},legacy=profile==='default'?read('kokab-games-v2')?.[id]:null;return {scores:Array.from({length:count},(_,i)=>Math.max(0,...[state.scores?.[i],legacy?.[i]].filter(x=>Number.isInteger(x)&&x>=1&&x<=3))),lastPlayed:Number(state.lastPlayed)||0,lastLevel:state.lastLevel,checkpoints:state.checkpoints||{}}}
