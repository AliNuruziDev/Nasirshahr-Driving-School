import fs from 'node:fs';
import vm from 'node:vm';
const elements = new Map();
function element(id){if(!elements.has(id))elements.set(id,{id,value:'',hidden:false,innerHTML:'',textContent:'',dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(){},querySelector(){return null},querySelectorAll(){return []}});return elements.get(id);}
const document={
  getElementById:element,
  querySelector(){return null;},querySelectorAll(){return [];},
  addEventListener(){},
  documentElement:{style:{setProperty(){}}},
  body:{classList:{toggle(){}}}
};
const localData={getMode:()=> 'local',listStudents:async()=>[],createStudent:async()=>({id:'x',name:'x',studentCode:'N-X'}),getStudentCase:async()=>({}),getMyCase:async()=>({})};
const context={console,document,window:{},localStorage:{getItem(){return null},setItem(){}},NasirData:localData,
  Intl,Date,URL,Blob,FormData,Math,Number,String,Array,Object,JSON,Promise,Error,Set,Map,RegExp,
  navigator:{},location:{protocol:'file:'},setTimeout,clearTimeout,Event};
context.window=context;context.NasirData=localData;
const code=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8')+'\n;globalThis.__ui={dashboard,schedulePage,peopleTable,learningPage,paymentsPage,announcementsPage,profilePage,reportsPage,settingsPage,documentPage,caseFilePage,studentRegistrationForm,selfRegistrationForm,caseProfileForm,myStudentsPage,instructorReportsPage,getScheduleItems,getAssignedStudentIds,rolePages,navByRole,sample,canAccessPage,state,jalaliToIso,isoToJalali,dateFa,jalaliCalendarData,jalaliMonthLength,jalaliDateField,formatJalaliDateTyping,todayIso,wireJalaliDateInputs};';
vm.runInNewContext(code,context,{timeout:5000});
const ui=context.__ui;
for(const role of ['student','instructor','admin']){
 ui.state.role=role;ui.state.name='کاربر نمونه';
 const html=ui.dashboard();
 if(!html.includes('welcome-hero')||!html.includes('stats-grid')) throw new Error('dashboard incomplete for '+role);
 console.log('dashboard',role,'OK',html.length);
}
ui.state.role='admin';
for(const [name,fn] of Object.entries({schedulePage:ui.schedulePage,peopleTable:()=>ui.peopleTable('students'),learningPage:ui.learningPage,paymentsPage:ui.paymentsPage,announcementsPage:ui.announcementsPage,profilePage:ui.profilePage,reportsPage:ui.reportsPage,settingsPage:ui.settingsPage,documentPage:()=>ui.documentPage(true),caseFilePage:ui.caseFilePage})){
 const html=fn(); if(typeof html!=='string'||html.length<300)throw new Error(name+' output too small'); console.log(name,'OK',html.length);
}

ui.state.role='admin';
const intake=ui.studentRegistrationForm();
for(const field of ['name','nationalId','phone','alternatePhone','guardianPhone','emergencyPhone','province','city','neighborhood','postalCode','address','tuitionAmountToman','initialPaidToman','nationalCard','birthCertificate','portrait','medical','other']){
 if(!intake.includes(`name="${field}"`)) throw new Error('Registration form missing '+field);
}
const studentAdmin=ui.peopleTable('students');
if(!studentAdmin.includes('تاریخ ثبت‌نام')||!studentAdmin.includes('۳ آذر ۱۴۰۵')) throw new Error('Student registry is missing Persian registration dates');
for(const term of ['ثبت هنرجوی جدید','نشانی','شهریه ثبت‌شده','data-action="exportStudents"']) if(!studentAdmin.includes(term)) throw new Error('Student admin list missing '+term);
const instructorAdmin=ui.peopleTable('instructors');
if(!instructorAdmin.includes('افزودن مربی')||!instructorAdmin.includes('حوزه فعالیت')) throw new Error('Instructor management regression');
const adminFinance=ui.paymentsPage();
for(const term of ['financeStudentsTable','ثبت دریافت جدید','مانده هر پرونده']) if(!adminFinance.includes(term)) throw new Error('Finance panel missing '+term);
const profileForm=ui.caseProfileForm({name:'تست',phone:'',tuitionAmountToman:123,city:'نصیرشهر'},true);
for(const field of ['alternatePhone','guardianPhone','emergencyPhone','province','city','neighborhood','postalCode','tuitionAmountToman','address']) if(!profileForm.includes(`name="${field}"`)) throw new Error('Case profile missing '+field);
console.log('ADMIN INTAKE SMOKE TEST: OK');


// Role isolation and per-person schedule smoke tests.
ui.state.role='student';ui.state.userId='demo-student-01';
const studentSchedule=ui.getScheduleItems();
const studentSchedulePage=ui.schedulePage();
if(!studentSchedulePage.includes('آرمان رضایی')||studentSchedulePage.includes('نگار محمدی')||studentSchedulePage.includes('پارسا کریمی'))throw new Error('Student schedule page contains another student lesson');
if(studentSchedule.length!==1||studentSchedule[0].studentId!=='demo-student-01')throw new Error('Student schedule is not scoped to the signed-in student');
if(ui.canAccessPage('caseFiles','student')||ui.canAccessPage('payments','instructor')||ui.canAccessPage('documentArchive','instructor'))throw new Error('Role boundary leak in page permissions');
if(!ui.canAccessPage('payments','student')||!ui.canAccessPage('schedule','instructor')||!ui.canAccessPage('students','admin'))throw new Error('Role page permission missing');
const studentPayments=ui.paymentsPage();if(!studentPayments.includes('studentPaymentPanel')||studentPayments.includes('financeStudentsTable'))throw new Error('Student financial page shows admin finance UI');
const studentCase=ui.caseFilePage();if(!studentCase.includes('value="demo-student-01"')||studentCase.includes('for="caseStudentSelector"'))throw new Error('Student case selector is not bound to own account');

ui.state.role='instructor';ui.state.userId='demo-instructor-01';ui.state.name='حسین احمدی';
const instructorOne=ui.getScheduleItems();
const instructorOnePage=ui.schedulePage();
if(!instructorOnePage.includes('آرمان رضایی')||!instructorOnePage.includes('پارسا کریمی')||instructorOnePage.includes('نگار محمدی'))throw new Error('Instructor schedule page contains other instructor student');
if(instructorOne.length!==2||instructorOne.some(x=>x.instructorId!=='demo-instructor-01'))throw new Error('Instructor schedule is not scoped');
const assignedOne=ui.getAssignedStudentIds();if(assignedOne.length!==2||!assignedOne.includes('demo-student-01')||!assignedOne.includes('demo-student-03'))throw new Error('Instructor assignment list is incorrect');
const instructorList=ui.myStudentsPage();if(!instructorList.includes('آرمان رضایی')||!instructorList.includes('پارسا کریمی')||instructorList.includes('نگار محمدی'))throw new Error('Instructor can see unassigned students or assigned student missing');
if(instructorList.includes('کد ملی')||instructorList.includes('شهریه')||instructorList.includes('نشانی کامل'))throw new Error('Instructor list exposes sensitive case/finance fields');
const instructorReports=ui.reportsPage();if(!instructorReports.includes('گزارش‌های من')&&!instructorReports.includes('گزارش جلسات من'))throw new Error('Instructor reports page missing');
ui.state.userId='demo-instructor-02';ui.state.name='مریم حسینی';
const instructorTwo=ui.getScheduleItems();const instructorTwoPage=ui.schedulePage();if(!instructorTwoPage.includes('نگار محمدی')||instructorTwoPage.includes('آرمان رضایی')||instructorTwoPage.includes('پارسا کریمی'))throw new Error('Second instructor schedule page contains another instructor student');if(instructorTwo.length!==1||instructorTwo[0].studentId!=='demo-student-02')throw new Error('Second instructor sees another instructor schedule');

ui.state.role='admin';ui.state.userId='demo-admin-01';
if(ui.getScheduleItems().length!==3)throw new Error('Admin should see all sample sessions');
const adminSchedule=ui.schedulePage();if(!adminSchedule.includes('افزودن جلسه')||!adminSchedule.includes('آرمان رضایی')||!adminSchedule.includes('نگار محمدی')||!adminSchedule.includes('پارسا کریمی'))throw new Error('Admin must see the academy-wide schedule');
if(ui.sample.schedule.some(x=>!x.date||!x.day))throw new Error('Sample lessons need person-specific dates and weekdays');
console.log('ROLE-SCOPED WORKSPACE SMOKE TEST: OK');


// Navigation and personal workspace boundaries.
const navPages = role => ui.navByRole[role].map(x=>x[0]);
const studentNav = navPages('student');
const instructorNav = navPages('instructor');
const adminNav = navPages('admin');
for (const page of ['caseFile','schedule','documents','learning','payments','profile']) if (!studentNav.includes(page)) throw new Error('Student navigation missing '+page);
for (const forbidden of ['caseFiles','documentArchive','students','instructors','reports','settings']) if (studentNav.includes(forbidden)) throw new Error('Student navigation exposes '+forbidden);
for (const page of ['schedule','myStudents','reports','profile']) if (!instructorNav.includes(page)) throw new Error('Instructor navigation missing '+page);
for (const forbidden of ['caseFile','caseFiles','documents','documentArchive','payments','students','instructors','settings']) if (instructorNav.includes(forbidden)) throw new Error('Instructor navigation exposes '+forbidden);
for (const page of ['caseFiles','students','instructors','schedule','documentArchive','payments','reports','settings']) if (!adminNav.includes(page)) throw new Error('Admin navigation missing '+page);
if (ui.canAccessPage('caseFile','instructor') || ui.canAccessPage('documentArchive','student') || ui.canAccessPage('payments','instructor')) throw new Error('A personal role can enter another role workspace');
ui.state.role='student';ui.state.userId='demo-student-01';
const studentDash = ui.dashboard.call(ui);
if (studentDash.includes('۳,۵۰۰,۰۰۰') || studentDash.includes('۸ جلسه') || studentDash.includes('۶۲٪')) throw new Error('Student dashboard still contains shared fixed sample numbers');
ui.state.role='instructor';ui.state.userId='demo-instructor-01';
const instructorDash=ui.dashboard();
if (instructorDash.includes('۲۴ نفر') || instructorDash.includes('۵ جلسه')) throw new Error('Instructor dashboard still contains shared fixed sample numbers');
const appSource=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
if (!appSource.includes('getInstructorStudentReports(st.id,state.userId)')) throw new Error('Instructor report requests are not scoped to active instructor');
console.log('PERSONAL NAVIGATION AND DASHBOARD TEST: OK');


// Persian Jalali dates must display in Persian digits and persist as ISO dates.
if(ui.jalaliToIso('۱۴۰۵/۰۹/۰۳')!=='2026-11-24')throw new Error('Jalali date conversion failed for 1405/09/03');
if(ui.isoToJalali('2026-11-24')!=='۱۴۰۵/۰۹/۰۳')throw new Error('Gregorian to Jalali display failed');
if(!ui.dateFa('2026-11-24').includes('۱۴۰۵'))throw new Error('Dates are not displayed with Persian calendar year');
const azCalendar=ui.jalaliCalendarData(1405,9);
if(azCalendar.days.length!==30||azCalendar.leading!==1||azCalendar.days[2].iso!=='2026-11-24')throw new Error('Jalali date picker month grid is incorrect');
if(ui.jalaliMonthLength(1403,12)!==30||ui.jalaliMonthLength(1404,12)!==29)throw new Error('Persian leap-year month length is incorrect');
const dateMarkup=ui.jalaliDateField('testDate','تاریخ آزمایشی','2026-11-24');
for(const token of ['type=\"button\"','data-jalali-date-open','data-jalali-picker','۱۴۰۵/۰۹/۰۳','aria-haspopup=\"dialog\"'])if(!dateMarkup.includes(token))throw new Error('Ready Jalali calendar control missing '+token);
const birthMarkup=ui.jalaliDateField('birthDate','تاریخ تولد','',{manual:true});
if(!birthMarkup.includes('data-jalali-manual=\"true\"')||birthMarkup.includes('data-jalali-date-open')||birthMarkup.includes('data-jalali-picker'))throw new Error('Birth date should be manual input without a calendar icon');
const typedDate=ui.formatJalaliDateTyping('۱۴۰۵۰۹۰۳',8);if(typedDate.value!=='۱۴۰۵/۰۹/۰۳')throw new Error('Birth date auto-slash formatting failed');
const typedYear=ui.formatJalaliDateTyping('۱۴۰۵',4);if(typedYear.value!=='۱۴۰۵/')throw new Error('Year separator was not placed automatically');
let invalidJalali=false;try{ui.jalaliToIso('۱۴۰۵/۱۲/۳۰')}catch(_){invalidJalali=true;}if(!invalidJalali)throw new Error('Invalid Esfand date was accepted');
const newStudentForm=ui.studentRegistrationForm();
for(const token of ['registration-intro','مشخصات و ثبت‌نام هنرجو','data-jalali-date-input=\"birthDate\"','data-jalali-manual=\"true\"','data-jalali-date-input=\"registrationDate\"','name=\"registrationDate\"'])if(!newStudentForm.includes(token))throw new Error('Polished student registration or Persian date field missing: '+token);
const selfForm=ui.selfRegistrationForm();if(!selfForm.includes('registration-intro')||!selfForm.includes('data-jalali-date-input=\"birthDate\"'))throw new Error('Self-registration Persian date field is missing');
const editableCase=ui.caseProfileForm({name:'آزمایش',birthDate:'2000-01-01',registrationDate:'2026-11-24'},true);if(!editableCase.includes('data-jalali-date-input=\"birthDate\"')||!editableCase.includes('data-jalali-manual=\"true\"')||!editableCase.includes('data-jalali-date-input=\"registrationDate\"')||!editableCase.includes('data-jalali-date-open'))throw new Error('Case-file birth date must be manual while registration date keeps its calendar');
console.log('PERSIAN REGISTRATION AND JALALI DATE SMOKE TEST: OK');

// The calendar button must open the picker and a selected day must update both display and stored ISO value.
const listeners={};
const classes=new Set();
const fakePicker={dataset:{},hidden:true,innerHTML:'',listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}};
const fakeButton={attrs:{},listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},setAttribute(k,v){this.attrs[k]=v;}};
const fakeHidden={value:'2026-11-24'};
const fakeError={textContent:'',hidden:true};
const fakeWrap={querySelector(selector){return selector==='[data-jalali-picker]'?fakePicker:selector==='[data-jalali-date-value]'?fakeHidden:selector==='[data-jalali-date-open]'?fakeButton:selector==='[data-jalali-date-error]'?fakeError:null;},classList:{add(x){classes.add(x);},remove(x){classes.delete(x);}}};
const fakeInput={value:'۱۴۰۵/۰۹/۰۳',required:true,readOnly:false,dataset:{},listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},closest(){return fakeWrap;},setCustomValidity(value){this.validationMessage=value;},dispatchEvent(event){this.lastEvent=event;}};
ui.wireJalaliDateInputs({querySelectorAll(){return [fakeInput];}});
fakeButton.listeners.click({preventDefault(){},stopPropagation(){}});
if(fakePicker.hidden||fakeButton.attrs['aria-expanded']!=='true'||!classes.has('is-open'))throw new Error('Calendar icon did not open the Jalali picker');
const fakeDay={dataset:{jalaliDay:'3'}};
fakePicker.listeners.click({target:{closest(selector){return selector==='[data-jalali-day]'?fakeDay:null;}}});
if(fakeHidden.value!=='2026-11-24'||fakeInput.value!=='۱۴۰۵/۰۹/۰۳'||!fakePicker.hidden||fakeButton.attrs['aria-expanded']!=='false')throw new Error('Selecting a day did not update the field and close the picker');
console.log('JALALI CALENDAR OPEN / SELECT INTERACTION TEST: OK');

// Birth date is manually entered; slashes auto-appear and the hidden form value remains ISO.
const manualClasses=new Set();
const manualHidden={value:''};
const manualError={textContent:'',hidden:true};
const manualWrap={querySelector(selector){return selector==='[data-jalali-date-value]'?manualHidden:selector==='[data-jalali-date-error]'?manualError:null;},classList:{add(x){manualClasses.add(x);},remove(x){manualClasses.delete(x);}}};
const manualInput={value:'۱۴۰۵۰۹۰۳',selectionStart:8,required:false,readOnly:false,dataset:{jalaliManual:'true'},listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},closest(){return manualWrap;},setCustomValidity(value){this.validationMessage=value;},setSelectionRange(start){this.selectionStart=start;}};
ui.wireJalaliDateInputs({querySelectorAll(){return [manualInput];}});
manualInput.listeners.input();
if(manualInput.value!=='۱۴۰۵/۰۹/۰۳'||manualHidden.value!=='2026-11-24'||manualInput.validationMessage!=='')throw new Error('Manual birth-date field did not format and store the entered date');
manualInput.value='۱۴۰۵';manualInput.selectionStart=4;manualInput.listeners.input();
if(manualInput.value!=='۱۴۰۵/'||manualHidden.value!==''||!manualInput.validationMessage)throw new Error('Incomplete manual birth date was not handled correctly');
manualInput.listeners.blur();
if(manualError.hidden||!manualError.textContent.includes('سال/ماه/روز'))throw new Error('Manual birth-date validation hint was not shown after leaving an incomplete field');
console.log('MANUAL BIRTH DATE AUTO-SLASH + VALIDATION TEST: OK');

