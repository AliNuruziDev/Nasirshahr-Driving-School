/*
 * NASIR Driving Academy - extensible data layer v0.8
 * Local IndexedDB adapter for prototyping; REST adapter for future backend.
 * Never use local mode for real identity/sensitive records in production.
 */
(function (global) {
  'use strict';
  const projectConfig = global.NASIR_APP_CONFIG || {};
  const CONFIG = {
    mode: projectConfig.mode || 'local',
    apiBaseUrl: projectConfig.apiBaseUrl || '/api/v1',
    databaseName: 'nasir-driving-academy',
    databaseVersion: 2,
    maxDocumentBytes: 12 * 1024 * 1024,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  };
  const demoStudents = [
    { id:'demo-student-01', name:'آرمان رضایی', studentCode:'N-1405-021', code:'N-1405-021', phone:'۰۹۱۲ *** ۳۴۱۲', course:'پایه سوم', status:'در حال آموزش', stage:'training', registrationDate:'2026-10-20', nationalId:'', birthDate:'', address:'', guardianName:'' },
    { id:'demo-student-02', name:'نگار محمدی', studentCode:'N-1405-022', code:'N-1405-022', phone:'۰۹۳۵ *** ۸۸۲۱', course:'پایه سوم', status:'تکمیل مدارک', stage:'documents_pending', registrationDate:'2026-10-27', nationalId:'', birthDate:'', address:'', guardianName:'' },
    { id:'demo-student-03', name:'پارسا کریمی', studentCode:'N-1405-023', code:'N-1405-023', phone:'۰۹۱۰ *** ۵۷۰۴', course:'پایه سوم', status:'در حال آموزش', stage:'training', registrationDate:'2026-11-01', nationalId:'', birthDate:'', address:'', guardianName:'' },
    { id:'demo-student-04', name:'هانیه مرادی', studentCode:'N-1405-024', code:'N-1405-024', phone:'۰۹۹۱ *** ۲۱۹۰', course:'پایه سوم', status:'در انتظار شروع', stage:'registered', registrationDate:'2026-11-08', nationalId:'', birthDate:'', address:'', guardianName:'' }
  ];
  const STORE_NAMES = ['contracts','payments','practicalSessions','exams','finalResults','workflowEvents'];
  const uid = () => (global.crypto && crypto.randomUUID) ? crypto.randomUUID() : `nasir-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nowISO = () => new Date().toISOString();
  function requestResult(request) { return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('خطا در خواندن اطلاعات'));}); }
  function transactionDone(tx) { return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('ذخیره اطلاعات انجام نشد'));tx.onabort=()=>reject(tx.error||new Error('عملیات ذخیره لغو شد'));}); }
  function auditRecord(entityType, entityId, action, actorId, details={}) { return {id:uid(),entityType,entityId,action,actorId:actorId||'demo-user',details,createdAt:nowISO()}; }
  function normalizeStageStatus(stage) {
    return ({registered:'ثبت اولیه',documents_pending:'تکمیل مدارک',contract_signed:'قرارداد ثبت‌شده',training:'در حال آموزش',theory_exam:'در انتظار/انجام آزمون آیین‌نامه',practical_exam:'در انتظار/انجام آزمون عملی',completed:'آموزش تکمیل‌شده',archived:'بایگانی‌شده'})[stage] || 'در حال بررسی';
  }

  class LocalAdapter {
    constructor(){this.dbPromise=null;}
    open(){
      if(this.dbPromise)return this.dbPromise;
      if(!('indexedDB' in global))return Promise.reject(new Error('مرورگر شما IndexedDB را پشتیبانی نمی‌کند.'));
      this.dbPromise=new Promise((resolve,reject)=>{
        const req=indexedDB.open(CONFIG.databaseName,CONFIG.databaseVersion);
        req.onupgradeneeded=()=>{
          const db=req.result;
          if(!db.objectStoreNames.contains('students')){const s=db.createObjectStore('students',{keyPath:'id'});s.createIndex('studentCode','studentCode',{unique:true});}
          if(!db.objectStoreNames.contains('documents')){const s=db.createObjectStore('documents',{keyPath:'id'});s.createIndex('studentId','studentId',{unique:false});s.createIndex('status','status',{unique:false});s.createIndex('createdAt','createdAt',{unique:false});}
          if(!db.objectStoreNames.contains('documentFiles'))db.createObjectStore('documentFiles',{keyPath:'documentId'});
          if(!db.objectStoreNames.contains('auditLogs')){const s=db.createObjectStore('auditLogs',{keyPath:'id'});s.createIndex('entityId','entityId',{unique:false});s.createIndex('createdAt','createdAt',{unique:false});}
          if(!db.objectStoreNames.contains('syncQueue')){const s=db.createObjectStore('syncQueue',{keyPath:'id'});s.createIndex('status','status',{unique:false});}
          STORE_NAMES.forEach(name=>{if(!db.objectStoreNames.contains(name)){const s=db.createObjectStore(name,{keyPath:'id'});s.createIndex('studentId','studentId',{unique:false});s.createIndex('createdAt','createdAt',{unique:false});}});
        };
        req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('پایگاه داده محلی باز نشد.'));
      });return this.dbPromise;
    }
    async seedStudents(){const db=await this.open();const tx=db.transaction('students','readwrite');const store=tx.objectStore('students');const count=store.count();count.onsuccess=()=>{if(count.result===0)demoStudents.forEach(x=>store.put(x));};await transactionDone(tx);}
    async listStudents(){await this.seedStudents();const db=await this.open();return requestResult(db.transaction('students','readonly').objectStore('students').getAll());}
    async createStudent(input,actorId){
      await this.seedStudents();
      const cleanName=String(input.name||'').trim();
      if(cleanName.length<3)throw new Error('نام هنرجو را کامل وارد کنید.');
      const existing=await this.listStudents();
      const phone=String(input.phone||'').trim();
      const persianYear=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric'}).format(new Date());
      let sequence=Math.max(existing.length+21,25), studentCode=String(input.studentCode||`N-${persianYear}-${String(sequence).padStart(3,'0')}`);
      while(existing.some(x=>x.studentCode===studentCode)){sequence++;studentCode=`N-${persianYear}-${String(sequence).padStart(3,'0')}`;}
      if(existing.some(x=>x.studentCode===studentCode))throw new Error('شماره پرونده تکراری است.');
      const id=uid(),now=nowISO();
      const student={id,name:cleanName,studentCode,code:studentCode,phone,alternatePhone:String(input.alternatePhone||''),course:String(input.course||'پایه سوم'),status:'در انتظار شروع',stage:'registered',registrationDate:input.registrationDate||now.slice(0,10),nationalId:String(input.nationalId||''),birthDate:String(input.birthDate||''),guardianName:String(input.guardianName||''),guardianPhone:String(input.guardianPhone||''),emergencyPhone:String(input.emergencyPhone||''),province:String(input.province||'تهران'),city:String(input.city||'نصیرشهر'),neighborhood:String(input.neighborhood||''),postalCode:String(input.postalCode||''),address:String(input.address||''),tuitionAmountToman:Math.max(0,Number(input.tuitionAmountToman)||0),registrationStatus:input.registrationStatus||'approved',registrationSource:input.registrationSource||'admin',assignedInstructorId:String(input.assignedInstructorId||''),createdAt:now,updatedAt:now};
      const db=await this.open();
      const tx=db.transaction(['students','auditLogs','workflowEvents'],'readwrite');
      tx.objectStore('students').add(student);
      tx.objectStore('auditLogs').add(auditRecord('student',id,'created',actorId,{studentCode}));
      tx.objectStore('workflowEvents').add({id:uid(),studentId:id,type:'student_created',title:'پرونده هنرجو ایجاد شد',description:`پرونده ${studentCode} ثبت شد.`,actorId:actorId||'demo-admin',createdAt:now});
      await transactionDone(tx);return student;
    }
    async registerStudent(input,actorId){
      const student=await this.createStudent({...input,tuitionAmountToman:0,registrationStatus:'pending_review',registrationSource:'self_service'},actorId||'student-self-registration');
      const updated={...student,registrationStatus:'pending_review',status:'در انتظار بررسی مدیریت'};
      const db=await this.open();const tx=db.transaction(['students','auditLogs','workflowEvents'],'readwrite');
      tx.objectStore('students').put(updated);
      tx.objectStore('auditLogs').add(auditRecord('student',student.id,'registration_submitted',actorId||student.id,{studentCode:student.studentCode}));
      tx.objectStore('workflowEvents').add({id:uid(),studentId:student.id,type:'registration_submitted',title:'درخواست ثبت‌نام ارسال شد',description:'در انتظار بررسی و تأیید مدیریت آموزشگاه.',actorId:actorId||student.id,createdAt:nowISO()});
      await transactionDone(tx);return updated;
    }
    async uploadRegistrationRequestDocument(requestId,category,file){throw new Error('در حالت محلی، ابتدا پرونده ساخته می‌شود و سپس سند در همان پرونده ذخیره می‌شود.');}
    async getStudent(id){const db=await this.open();await this.seedStudents();return requestResult(db.transaction('students','readonly').objectStore('students').get(id));}
    async updateStudentProfile(id,patch,actorId){const db=await this.open();const current=await this.getStudent(id);if(!current)throw new Error('پرونده هنرجو پیدا نشد.');const allowed=['name','phone','alternatePhone','nationalId','birthDate','address','province','city','neighborhood','postalCode','guardianName','guardianPhone','emergencyPhone','course','registrationDate','tuitionAmountToman'];const next={...current};allowed.forEach(k=>{if(patch[k]!==undefined)next[k]=k==='tuitionAmountToman'?Math.max(0,Number(patch[k])||0):String(patch[k]||'').trim();});next.updatedAt=nowISO();const tx=db.transaction(['students','auditLogs','workflowEvents'],'readwrite');tx.objectStore('students').put(next);tx.objectStore('auditLogs').add(auditRecord('student',id,'profile_updated',actorId,{fields:Object.keys(patch)}));tx.objectStore('workflowEvents').add({id:uid(),studentId:id,type:'profile_updated',title:'اطلاعات پرونده ویرایش شد',description:'اطلاعات پایه هنرجو به‌روزرسانی شد.',actorId:actorId||'demo-user',createdAt:nowISO()});await transactionDone(tx);return next;}
    async setStudentStage(id,stage,note,actorId){const valid=['registered','documents_pending','contract_signed','training','theory_exam','practical_exam','completed','archived'];if(!valid.includes(stage))throw new Error('مرحله انتخاب‌شده معتبر نیست.');const db=await this.open();const current=await this.getStudent(id);if(!current)throw new Error('پرونده هنرجو پیدا نشد.');const previous=current.stage||'registered';const next={...current,stage,status:normalizeStageStatus(stage),updatedAt:nowISO()};const tx=db.transaction(['students','auditLogs','workflowEvents'],'readwrite');tx.objectStore('students').put(next);tx.objectStore('auditLogs').add(auditRecord('student',id,'stage_changed',actorId,{previous,stage,note}));tx.objectStore('workflowEvents').add({id:uid(),studentId:id,type:'stage_changed',title:`مرحله پرونده: ${normalizeStageStatus(stage)}`,description:note||`وضعیت از «${normalizeStageStatus(previous)}» به «${normalizeStageStatus(stage)}» تغییر کرد.`,actorId:actorId||'demo-user',createdAt:nowISO()});await transactionDone(tx);return next;}
    async listDocuments(filters={}){const db=await this.open();const all=await requestResult(db.transaction('documents','readonly').objectStore('documents').getAll());const q=String(filters.query||'').trim().toLocaleLowerCase();return all.filter(d=>{if(filters.studentId&&d.studentId!==filters.studentId)return false;if(filters.status&&filters.status!=='all'&&d.status!==filters.status)return false;if(!filters.includeDeleted&&d.status==='deleted')return false;if(q&&![d.originalName,d.studentName,d.category,d.description,d.studentCode].some(v=>String(v||'').toLocaleLowerCase().includes(q)))return false;return true;}).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}
    async listMyDocuments(studentId,filters={}){if(!studentId)throw new Error('شناسه پرونده هنرجو مشخص نیست.');return this.listDocuments({...filters,studentId});}
    async getDocument(id){const db=await this.open();return requestResult(db.transaction('documents','readonly').objectStore('documents').get(id));}
    async getDocumentFile(id){const db=await this.open();const r=await requestResult(db.transaction('documentFiles','readonly').objectStore('documentFiles').get(id));if(!r)throw new Error('فایل این سند در حافظه محلی پیدا نشد.');return r.blob;}
    async uploadDocument(input,file){
      if(!file)throw new Error('ابتدا فایل سند را انتخاب کنید.');if(file.size>CONFIG.maxDocumentBytes)throw new Error('حجم فایل بیشتر از ۱۲ مگابایت است.');if(!CONFIG.allowedMimeTypes.includes(file.type))throw new Error('فقط PDF، JPG، PNG یا WebP پذیرفته می‌شود.');
      const students=await this.listStudents();const student=students.find(x=>x.id===input.studentId);if(!student)throw new Error('هنرجوی انتخاب‌شده پیدا نشد.');const id=uid(),now=nowISO();
      const meta={id,studentId:student.id,studentName:student.name,studentCode:student.studentCode,category:String(input.category||'سایر مدارک'),description:String(input.description||'').trim(),referenceNumber:String(input.referenceNumber||'').trim(),issuedAt:input.issuedAt||null,expiresAt:input.expiresAt||null,originalName:file.name,mimeType:file.type,size:file.size,status:'active',createdAt:now,updatedAt:now,archivedAt:null,uploadedBy:input.actorId||'demo-user',schemaVersion:1};
      const db=await this.open();const tx=db.transaction(['documents','documentFiles','auditLogs','workflowEvents'],'readwrite');tx.objectStore('documents').add(meta);tx.objectStore('documentFiles').put({documentId:id,blob:file});tx.objectStore('auditLogs').add(auditRecord('document',id,'uploaded',input.actorId,{fileName:file.name,studentId:student.id}));tx.objectStore('workflowEvents').add({id:uid(),studentId:student.id,type:'document_uploaded',title:'سند جدید به پرونده اضافه شد',description:`${meta.category}: ${file.name}`,actorId:input.actorId||'demo-user',createdAt:now});await transactionDone(tx);return meta;
    }
    async setDocumentStatus(id,status,actorId){const existing=await this.getDocument(id);if(!existing)throw new Error('سند موردنظر پیدا نشد.');if(existing.status==='deleted')throw new Error('سند حذف‌شده قابل تغییر نیست.');const now=nowISO(),updated={...existing,status,updatedAt:now,archivedAt:status==='archived'?now:null};const db=await this.open();const tx=db.transaction(['documents','auditLogs','workflowEvents'],'readwrite');tx.objectStore('documents').put(updated);tx.objectStore('auditLogs').add(auditRecord('document',id,status,actorId,{previousStatus:existing.status}));tx.objectStore('workflowEvents').add({id:uid(),studentId:existing.studentId,type:`document_${status}`,title:status==='archived'?'سند بایگانی شد':'سند بازیابی شد',description:existing.originalName,actorId:actorId||'demo-user',createdAt:now});await transactionDone(tx);return updated;}
    async uploadMyDocument(studentId,input,file){if(!studentId||input.studentId!==studentId)throw new Error('بارگذاری سند فقط برای پرونده خودتان مجاز است.');return this.uploadDocument({...input,studentId},file);}
    async archiveDocument(id,actorId){return this.setDocumentStatus(id,'archived',actorId);} async restoreDocument(id,actorId){return this.setDocumentStatus(id,'active',actorId);}
    async deleteDocument(id,actorId){const existing=await this.getDocument(id);if(!existing)throw new Error('سند موردنظر پیدا نشد.');const now=nowISO(),updated={...existing,status:'deleted',updatedAt:now,deletedAt:now};const db=await this.open();const tx=db.transaction(['documents','auditLogs'],'readwrite');tx.objectStore('documents').put(updated);tx.objectStore('auditLogs').add(auditRecord('document',id,'deleted',actorId));await transactionDone(tx);return updated;}
    async listAuditLogs(entityId){const db=await this.open();const logs=await requestResult(db.transaction('auditLogs','readonly').objectStore('auditLogs').getAll());return logs.filter(x=>!entityId||x.entityId===entityId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
    async getStudentCase(studentId){const db=await this.open();const student=await this.getStudent(studentId);if(!student)throw new Error('پرونده هنرجو پیدا نشد.');const names=['contracts','payments','practicalSessions','exams','finalResults','workflowEvents','documents'];const data={student};for(const name of names){const all=await requestResult(db.transaction(name,'readonly').objectStore(name).getAll());data[name]=all.filter(x=>x.studentId===studentId|| (name==='finalResults'&&x.studentId===studentId)).sort((a,b)=>String(b.createdAt||b.date||'').localeCompare(String(a.createdAt||a.date||'')));}data.finalResult=data.finalResults[0]||null;data.auditLogs=await this.listAuditLogs();data.auditLogs=data.auditLogs.filter(x=>x.entityId===studentId||x.details?.studentId===studentId);return data;}
    // Instructor view returns only lesson reports, never student identity documents, contracts or payments.
    async getInstructorStudentReports(studentId,instructorId){const db=await this.open();const all=await requestResult(db.transaction('practicalSessions','readonly').objectStore('practicalSessions').getAll());return {practicalSessions:all.filter(x=>x.studentId===studentId&&x.instructorId===instructorId).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))};}
    async getMyCase(studentId){return this.getStudentCase(studentId);}
    async submitPaymentRequest(studentId,input){const c=await this.getStudentCase(studentId),s=c.student,fee=Number(s.tuitionAmountToman)||Number(c.contracts?.find(x=>x.status!=='cancelled')?.amountToman)||0,paid=(c.payments||[]).filter(x=>!['cancelled','pending'].includes(x.status)).reduce((a,x)=>a+Number(x.amountToman||0),0),amount=Number(input.amountToman)||0,balance=Math.max(0,fee-paid);if(amount<=0||amount>balance)throw new Error('مبلغ اعلام‌شده باید مثبت و حداکثر برابر مانده شهریه باشد.');return this.addCaseRecord('payments',{...input,studentId,amountToman:amount,status:'pending',paymentType:'اعلام پرداخت هنرجو'},studentId);}
    async addInstructorStudentReport(studentId,input,instructorId){if(!instructorId||input.instructorId!==instructorId)throw new Error('شناسه مربی معتبر نیست.');return this.addCaseRecord('practicalSessions',{...input,studentId,instructorId},instructorId);}
    async listMyAssignedStudents(){return [];}
    async listSchedule(){return [];}
    async createSchedule(){throw new Error('برنامه‌ریزی سرور در حالت محلی فعال نیست.');}
    async addCaseRecord(collection,input,actorId){if(!['contracts','payments','practicalSessions','exams'].includes(collection))throw new Error('نوع اطلاعات مجاز نیست.');const student=await this.getStudent(input.studentId);if(!student)throw new Error('هنرجو پیدا نشد.');const record={...input,id:uid(),studentId:student.id,createdBy:actorId||'demo-user',createdAt:nowISO(),updatedAt:nowISO()};if(collection==='payments'&&(!(Number(record.amountToman)>0)||!Number.isFinite(Number(record.amountToman))))throw new Error('مبلغ پرداخت باید بیشتر از صفر باشد.');if(collection==='payments'){record.amountToman=Number(record.amountToman);record.status=record.status||'received';record.method=record.method||'cash';record.paymentDate=record.paymentDate||nowISO().slice(0,10);}if(collection==='contracts')record.amountToman=Math.max(0,Number(record.amountToman)||0);if(collection==='practicalSessions'&&!record.date)throw new Error('تاریخ جلسه را وارد کنید.');if(collection==='exams'&&!record.date)throw new Error('تاریخ آزمون را وارد کنید.');if(collection==='contracts'&&!record.contractNumber)record.contractNumber=`NAS-${Date.now()}`;const db=await this.open();const tx=db.transaction([collection,'workflowEvents','auditLogs'],'readwrite');tx.objectStore(collection).add(record);const titles={contracts:'قرارداد به پرونده اضافه شد',payments:'پرداخت جدید ثبت شد',practicalSessions:'جلسه عملی ثبت شد',exams:'نتیجه آزمون ثبت شد'};tx.objectStore('workflowEvents').add({id:uid(),studentId:student.id,type:`${collection}_created`,title:titles[collection],description:record.note||record.topic||record.contractNumber||`${record.amountToman||''} تومان`,actorId:actorId||'demo-user',createdAt:record.createdAt});tx.objectStore('auditLogs').add(auditRecord(collection,record.id,'created',actorId,{studentId:student.id}));await transactionDone(tx);return record;}
    async updatePaymentStatus(paymentId,status,actorId){
      if(!['pending','received','cancelled'].includes(status))throw new Error('وضعیت پرداخت معتبر نیست.');
      const db=await this.open();const current=await requestResult(db.transaction('payments','readonly').objectStore('payments').get(paymentId));
      if(!current)throw new Error('پرداخت موردنظر پیدا نشد.');
      const updated={...current,status,updatedAt:nowISO(),verifiedAt:status==='received'?nowISO():null,verifiedBy:status==='received'?(actorId||'demo-admin'):null};
      const tx=db.transaction(['payments','workflowEvents','auditLogs'],'readwrite');tx.objectStore('payments').put(updated);
      tx.objectStore('workflowEvents').add({id:uid(),studentId:current.studentId,type:'payment_status_changed',title:status==='received'?'پرداخت تأیید شد':status==='cancelled'?'پرداخت لغو شد':'پرداخت در انتظار بررسی',description:`${Number(current.amountToman||0).toLocaleString('fa-IR')} تومان`,actorId:actorId||'demo-user',createdAt:nowISO()});
      tx.objectStore('auditLogs').add(auditRecord('payment',paymentId,'status_changed',actorId,{studentId:current.studentId,previous:current.status,status}));
      await transactionDone(tx);return updated;
    }
    async saveFinalResult(input,actorId){const student=await this.getStudent(input.studentId);if(!student)throw new Error('هنرجو پیدا نشد.');const db=await this.open();const all=await requestResult(db.transaction('finalResults','readonly').objectStore('finalResults').getAll());const old=all.find(x=>x.studentId===student.id);const record={...input,id:old?.id||uid(),studentId:student.id,createdAt:old?.createdAt||nowISO(),updatedAt:nowISO(),updatedBy:actorId||'demo-user'};const tx=db.transaction(['finalResults','workflowEvents','auditLogs','students'],'readwrite');tx.objectStore('finalResults').put(record);const completed=['passed','license_issued'].includes(record.status);if(completed){const updatedStudent={...student,stage:'completed',status:normalizeStageStatus('completed'),updatedAt:nowISO()};tx.objectStore('students').put(updatedStudent);}tx.objectStore('workflowEvents').add({id:uid(),studentId:student.id,type:'final_result_updated',title:'نتیجه نهایی پرونده به‌روزرسانی شد',description:record.status||'نتیجه ثبت شد',actorId:actorId||'demo-user',createdAt:nowISO()});tx.objectStore('auditLogs').add(auditRecord('finalResult',record.id,'updated',actorId,{studentId:student.id}));await transactionDone(tx);return record;}
    async addWorkflowEvent(studentId,input,actorId){const db=await this.open();const event={id:uid(),studentId,type:input.type||'note',title:String(input.title||'رویداد پرونده'),description:String(input.description||''),actorId:actorId||'demo-user',createdAt:nowISO()};const tx=db.transaction('workflowEvents','readwrite');tx.objectStore('workflowEvents').add(event);await transactionDone(tx);return event;}
  }

  class ApiAdapter {
    constructor(baseUrl){this.baseUrl=String(baseUrl||'').replace(/\/$/,'');}
    async request(path,options={}){const response=await fetch(`${this.baseUrl}${path}`,{credentials:'include',...options,headers:{...(options.body instanceof FormData?{}:{'Content-Type':'application/json'}),...(options.headers||{})}});if(!response.ok){let msg=`خطای سرور (${response.status})`;try{const body=await response.json();msg=body.message||body.error||msg;}catch(_){}throw new Error(msg);}if(response.status===204)return null;return response;}
    async listStudents(){return (await this.request('/students')).json();}
    async createStudent(input){return (await this.request('/students',{method:'POST',body:JSON.stringify(input)})).json();}
    async registerStudent(input){return (await this.request('/registration-requests',{method:'POST',body:JSON.stringify(input)})).json();}
    async uploadRegistrationRequestDocument(requestId,category,file){const f=new FormData();f.append('metadata',new Blob([JSON.stringify({category})],{type:'application/json'}));f.append('file',file,file.name);return (await this.request(`/registration-requests/${encodeURIComponent(requestId)}/documents`,{method:'POST',body:f})).json();}
    async getStudent(id){return (await this.request(`/students/${encodeURIComponent(id)}`)).json();}
    async updateStudentProfile(id,patch){return (await this.request(`/students/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(patch)})).json();}
    async setStudentStage(id,stage,note){return (await this.request(`/students/${encodeURIComponent(id)}/stage`,{method:'PATCH',body:JSON.stringify({stage,note})})).json();}
    async listDocuments(filters={}){const p=new URLSearchParams();Object.entries(filters).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')p.set(k,v);});return (await this.request(`/documents${p.size?`?${p}`:''}`)).json();}
    async listMyDocuments(_studentId,filters={}){const p=new URLSearchParams();Object.entries(filters).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')p.set(k,v);});return (await this.request(`/me/documents${p.size?`?${p}`:''}`)).json();}
    async getDocument(id){return (await this.request(`/documents/${encodeURIComponent(id)}`)).json();}
    async getDocumentFile(id){return this.request(`/documents/${encodeURIComponent(id)}/file`).then(r=>r.blob());}
    async uploadDocument(input,file){const f=new FormData();f.append('metadata',new Blob([JSON.stringify(input)],{type:'application/json'}));f.append('file',file,file.name);return (await this.request('/documents',{method:'POST',body:f})).json();}
    async uploadMyDocument(_studentId,input,file){const f=new FormData();const {studentId,...safeInput}=input;f.append('metadata',new Blob([JSON.stringify(safeInput)],{type:'application/json'}));f.append('file',file,file.name);return (await this.request('/me/documents',{method:'POST',body:f})).json();}
    async setDocumentStatus(id,action){return (await this.request(`/documents/${encodeURIComponent(id)}/${action}`,{method:'POST',body:'{}'})).json();}
    async archiveDocument(id){return this.setDocumentStatus(id,'archive');} async restoreDocument(id){return this.setDocumentStatus(id,'restore');}
    async deleteDocument(id){return this.request(`/documents/${encodeURIComponent(id)}`,{method:'DELETE'});}
    async listAuditLogs(entityId){return (await this.request(`/audit-logs?entityId=${encodeURIComponent(entityId||'')}`)).json();}
    async getStudentCase(id){return (await this.request(`/students/${encodeURIComponent(id)}/case-file`)).json();}
    async getInstructorStudentReports(studentId){return (await this.request(`/instructors/me/students/${encodeURIComponent(studentId)}/reports`)).json();}
    async addInstructorStudentReport(studentId,input){return (await this.request(`/instructors/me/students/${encodeURIComponent(studentId)}/reports`,{method:'POST',body:JSON.stringify(input)})).json();}
    async listMyAssignedStudents(){return (await this.request('/instructors/me/students')).json();}
    async listSchedule(role){const route=role==='admin'?'/admin/schedule':role==='instructor'?'/instructors/me/schedule':'/me/schedule';return (await this.request(route)).json();}
    async createSchedule(input){return (await this.request('/admin/schedule',{method:'POST',body:JSON.stringify(input)})).json();}
    async getMyCase(){return (await this.request('/me/case-file')).json();}
    async submitPaymentRequest(_studentId,input){return (await this.request('/me/payment-requests',{method:'POST',body:JSON.stringify(input)})).json();}
    async addCaseRecord(collection,input){const routes={contracts:'contracts',payments:'payments',practicalSessions:'practical-sessions',exams:'exams'};if(!routes[collection])throw new Error('نوع اطلاعات مجاز نیست.');return (await this.request(`/students/${encodeURIComponent(input.studentId)}/${routes[collection]}`,{method:'POST',body:JSON.stringify(input)})).json();}
    async updatePaymentStatus(paymentId,status){return (await this.request(`/payments/${encodeURIComponent(paymentId)}/status`,{method:'PATCH',body:JSON.stringify({status})})).json();}
    async saveFinalResult(input){return (await this.request(`/students/${encodeURIComponent(input.studentId)}/final-result`,{method:'PUT',body:JSON.stringify(input)})).json();}
    async addWorkflowEvent(studentId,input){return (await this.request(`/students/${encodeURIComponent(studentId)}/timeline`,{method:'POST',body:JSON.stringify(input)})).json();}
  }
  let adapter=null;function getAdapter(){if(!adapter)adapter=CONFIG.mode==='api'?new ApiAdapter(CONFIG.apiBaseUrl):new LocalAdapter();return adapter;}
  global.NasirData={config:CONFIG,configure(options={}){if(options.mode)CONFIG.mode=options.mode;if(options.apiBaseUrl)CONFIG.apiBaseUrl=options.apiBaseUrl;adapter=null;},getMode:()=>CONFIG.mode,
    listStudents:(...a)=>getAdapter().listStudents(...a),createStudent:(...a)=>getAdapter().createStudent(...a),registerStudent:(...a)=>getAdapter().registerStudent(...a),uploadRegistrationRequestDocument:(...a)=>getAdapter().uploadRegistrationRequestDocument(...a),getStudent:(...a)=>getAdapter().getStudent(...a),updateStudentProfile:(...a)=>getAdapter().updateStudentProfile(...a),setStudentStage:(...a)=>getAdapter().setStudentStage(...a),
    listDocuments:(...a)=>getAdapter().listDocuments(...a),listMyDocuments:(...a)=>getAdapter().listMyDocuments(...a),getDocument:(...a)=>getAdapter().getDocument(...a),getDocumentFile:(...a)=>getAdapter().getDocumentFile(...a),uploadDocument:(...a)=>getAdapter().uploadDocument(...a),uploadMyDocument:(...a)=>getAdapter().uploadMyDocument(...a),archiveDocument:(...a)=>getAdapter().archiveDocument(...a),restoreDocument:(...a)=>getAdapter().restoreDocument(...a),deleteDocument:(...a)=>getAdapter().deleteDocument(...a),listAuditLogs:(...a)=>getAdapter().listAuditLogs(...a),
    getStudentCase:(...a)=>getAdapter().getStudentCase(...a),getInstructorStudentReports:(...a)=>getAdapter().getInstructorStudentReports(...a),addInstructorStudentReport:(...a)=>getAdapter().addInstructorStudentReport(...a),listMyAssignedStudents:(...a)=>getAdapter().listMyAssignedStudents(...a),listSchedule:(...a)=>getAdapter().listSchedule(...a),createSchedule:(...a)=>getAdapter().createSchedule(...a),getMyCase:(...a)=>getAdapter().getMyCase(...a),submitPaymentRequest:(...a)=>getAdapter().submitPaymentRequest(...a),addCaseRecord:(...a)=>getAdapter().addCaseRecord(...a),updatePaymentStatus:(...a)=>getAdapter().updatePaymentStatus(...a),saveFinalResult:(...a)=>getAdapter().saveFinalResult(...a),addWorkflowEvent:(...a)=>getAdapter().addWorkflowEvent(...a)};
})(window);
