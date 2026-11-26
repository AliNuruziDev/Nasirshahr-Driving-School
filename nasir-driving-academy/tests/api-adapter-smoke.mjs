import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const calls=[];
let createdStudentPayload=null;
let uploadedDocument=false;
let uploadedMyDocument=false;
let uploadedRegistrationRequestDocument=false;
const mockResponses={
 '/students':[{id:'stu-1',name:'هنرجوی نمونه',studentCode:'N-1'}],
 '/students/stu-1/case-file':{student:{id:'stu-1',name:'هنرجوی نمونه',stage:'registered'},contracts:[],payments:[],practicalSessions:[],exams:[],finalResults:[],documents:[],workflowEvents:[]},
 '/me/case-file':{student:{id:'stu-1',name:'هنرجوی نمونه'},contracts:[],payments:[],practicalSessions:[],documents:[]},
 '/me/documents':[],
 '/instructors/me/students/stu-1/reports':{practicalSessions:[{id:'rep-1',instructorId:'inst-1',studentId:'stu-1'}]},
 '/instructors/me/students':[{id:'stu-1',name:'هنرجوی تخصیص‌یافته'}],
 '/instructors/me/schedule':[{id:'ses-1',studentId:'stu-1'}],
 '/me/schedule':[{id:'ses-2',studentId:'stu-1'}],
 '/admin/schedule':[{id:'ses-3',studentId:'stu-1'}],
 '/students/stu-1/contracts':{id:'con-1'},
 '/students/stu-1/payments':{id:'pay-1'},
 '/students/stu-1/practical-sessions':{id:'ses-1'},
 '/students/stu-1/exams':{id:'exam-1'},
 '/students/stu-1/final-result':{id:'result-1'},
 '/students/stu-1/stage':{ok:true},
 '/students/stu-1':{id:'stu-1',name:'هنرجوی نمونه'}
};
globalThis.window=globalThis;
globalThis.NASIR_APP_CONFIG={mode:'api',apiBaseUrl:'/api/v1'};
globalThis.fetch=async (url,options={})=>{
 const path=String(url).replace('/api/v1','');calls.push({path,method:options.method||'GET'});
 if(path==='/students'&&options.method==='POST')createdStudentPayload=JSON.parse(options.body);
 if(path==='/me/payment-requests'&&options.method==='POST'&&JSON.parse(options.body).status)throw new Error('Student client must not send an authoritative payment status');
 if(path==='/documents'&&options.method==='POST')uploadedDocument=options.body instanceof FormData;
 if(path==='/me/documents'&&options.method==='POST'){uploadedMyDocument=options.body instanceof FormData;const metadata=JSON.parse(await options.body.get('metadata').text());if(Object.hasOwn(metadata,'studentId'))throw new Error('Student upload must derive owner from session, not client metadata');}
 if(path==='/registration-requests/req-1/documents'&&options.method==='POST')uploadedRegistrationRequestDocument=options.body instanceof FormData;
 const body=(path==='/students'&&options.method==='POST')?{id:'stu-2',name:'هنرجوی تازه',studentCode:'N-2'}:(mockResponses[path]??{ok:true});
 return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
};
const dataLayerPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data-layer.js');
vm.runInThisContext(fs.readFileSync(dataLayerPath,'utf8'));
await NasirData.listStudents();
await NasirData.createStudent({name:'هنرجوی تازه',phone:'09120000000',city:'نصیرشهر',province:'تهران',neighborhood:'مرکزی',postalCode:'1234567890',address:'نشانی آزمایشی',nationalId:'0012345678',tuitionAmountToman:12000000});
await NasirData.uploadDocument({studentId:'stu-1',category:'مدرک هویتی'},new Blob(['test'],{type:'application/pdf'}));
await NasirData.getStudentCase('stu-1');
await NasirData.getMyCase('stu-1');
await NasirData.listMyDocuments('stu-1',{status:'all'});
await NasirData.uploadMyDocument('stu-1',{studentId:'stu-1',category:'مدرک اختصاصی'},new Blob(['mine'],{type:'application/pdf'}));
await NasirData.uploadRegistrationRequestDocument('req-1','کارت ملی',new Blob(['request'],{type:'application/pdf'}));
await NasirData.getInstructorStudentReports('stu-1','inst-1');
await NasirData.addInstructorStudentReport('stu-1',{topic:'پارک دوبل',instructorId:'inst-1'});
await NasirData.listMyAssignedStudents();
await NasirData.listSchedule('instructor');
await NasirData.listSchedule('student');
await NasirData.listSchedule('admin');
await NasirData.createSchedule({studentId:'stu-1',instructorId:'inst-1'});
await NasirData.submitPaymentRequest('stu-1',{amountToman:100000,paymentDate:'2026-11-20',method:'transfer'});
await NasirData.updateStudentProfile('stu-1',{name:'تست'},'admin-1');
await NasirData.setStudentStage('stu-1','training','شروع آموزش','admin-1');
for(const type of ['contracts','payments','practicalSessions','exams']) await NasirData.addCaseRecord(type,{studentId:'stu-1'},'admin-1');
await NasirData.saveFinalResult({studentId:'stu-1',status:'passed'},'admin-1');
const expected=['GET:/students','POST:/students','GET:/students/stu-1/case-file','GET:/me/case-file','GET:/me/documents?status=all','POST:/me/documents','POST:/registration-requests/req-1/documents','GET:/instructors/me/students/stu-1/reports','POST:/instructors/me/students/stu-1/reports','GET:/instructors/me/students','GET:/instructors/me/schedule','GET:/me/schedule','GET:/admin/schedule','POST:/admin/schedule','POST:/me/payment-requests','PATCH:/students/stu-1','PATCH:/students/stu-1/stage','POST:/students/stu-1/contracts','POST:/students/stu-1/payments','POST:/students/stu-1/practical-sessions','POST:/students/stu-1/exams','PUT:/students/stu-1/final-result'];
const actual=calls.map(x=>`${x.method}:${x.path}`);
for(const x of expected) if(!actual.includes(x)) throw new Error('Missing API route '+x);
for(const field of ['city','province','neighborhood','postalCode','address','nationalId','tuitionAmountToman']) if(!Object.hasOwn(createdStudentPayload||{},field)) throw new Error('Student intake payload missing '+field);
if(!uploadedDocument) throw new Error('Admin document upload did not use multipart FormData');
if(!uploadedMyDocument) throw new Error('Student self-document upload did not use /me/documents multipart route');
if(!uploadedRegistrationRequestDocument) throw new Error('Self-registration document upload did not use registration-request route');
console.log('API ADAPTER SMOKE TEST: OK');
console.log(actual.join('\n'));

console.log('PERSONAL DOCUMENT ROUTES TEST: OK');
