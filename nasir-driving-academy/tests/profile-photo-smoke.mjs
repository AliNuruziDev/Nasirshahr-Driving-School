import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const elements = new Map();
function element(id){
  if(!elements.has(id)) elements.set(id, {
    id, value:'', hidden:false, innerHTML:'', textContent:'', dataset:{}, style:{setProperty(){}},
    classList:{add(){},remove(){},toggle(){}}, setAttribute(){}, addEventListener(){},
    querySelector(){return null;}, querySelectorAll(){return [];}
  });
  return elements.get(id);
}
const document={
  getElementById:element, querySelector(){return null;}, querySelectorAll(){return [];},
  addEventListener(){}, documentElement:{style:{setProperty(){}}}, body:{classList:{toggle(){}}}
};
const localData={getMode:()=> 'local',listStudents:async()=>[],createStudent:async()=>({id:'x',name:'x',studentCode:'N-X'}),getStudentCase:async()=>({}),getMyCase:async()=>({})};
const context={console,document,window:{},localStorage:{getItem(){return null},setItem(){},removeItem(){}},NasirData:localData,
  Intl,Date,URL,Blob,FormData,Math,Number,String,Array,Object,JSON,Promise,Error,Set,Map,RegExp,Uint8Array,FileReader:function(){},
  navigator:{},location:{protocol:'file:'},setTimeout,clearTimeout};
context.window=context;context.NasirData=localData;
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8')+
  '\n;globalThis.__profileTest={profilePage,navByRole,rolePages,canAccessPage,optimizeProfileAvatar,saveProfileAvatar,readProfileAvatar,deleteProfileAvatar,hydrateProfileAvatar,state};';
vm.runInNewContext(source,context,{timeout:5000});
const ui=context.__profileTest;

for(const role of ['student','instructor','admin']){
  ui.state.role=role;
  ui.state.name='کاربر آزمایشی';
  assert.equal(ui.canAccessPage('profile',role),true,`profile page must be available to ${role}`);
  const profile=ui.profilePage();
  for(const item of ['profileAvatar','profilePhotoInput','image/jpeg,image/png,image/webp','profilePhotoPickButton','removeProfilePhotoButton','افزودن عکس پروفایل']){
    assert.ok(profile.includes(item),`profile UI is missing ${item} for ${role}`);
  }
  assert.ok(ui.navByRole[role].some(item=>item[0]==='profile'),`profile navigation is missing for ${role}`);
}

const css=fs.readFileSync(new URL('../theme-system.css',import.meta.url),'utf8');
for(const selector of ['.avatar img','.profile-avatar img','.profile-avatar-wrap','.profile-avatar-add','.profile-avatar-remove','.profile-photo-hint']){
  assert.ok(css.includes(selector),`profile photo styles are missing ${selector}`);
}
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
assert.match(sw,/v19-manual-birthdate/,'PWA cache must be refreshed for profile photo overlay controls');
const api=fs.readFileSync(new URL('../backend/API_CONTRACT.md',import.meta.url),'utf8');
assert.match(api,/GET \/me\/profile\/avatar/);
assert.match(api,/POST \/me\/profile\/avatar/);
assert.match(api,/DELETE \/me\/profile\/avatar/);
console.log('PROFILE PHOTO SMOKE TEST: OK');
