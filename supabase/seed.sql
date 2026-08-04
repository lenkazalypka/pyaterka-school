-- Local only. Password for all accounts: Demo123!
do $$declare a record;begin for a in select * from(values
('11111111-1111-4111-8111-111111111111'::uuid,'student@pyaterka.local','Лена','student'),
('22222222-2222-4222-8222-222222222222'::uuid,'parent@pyaterka.local','Ольга','parent'),
('33333333-3333-4333-8333-333333333333'::uuid,'teacher@pyaterka.local','Анна','teacher'),
('44444444-4444-4444-8444-444444444444'::uuid,'curator@pyaterka.local','Мария','curator'),
('55555555-5555-4555-8555-555555555555'::uuid,'admin@pyaterka.local','Ирина','admin'),
('66666666-6666-4666-8666-666666666666'::uuid,'student-onboarding@pyaterka.local','Саша','student'))v(id,email,name,role_code) loop
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)values('00000000-0000-0000-0000-000000000000',a.id,'authenticated','authenticated',a.email,crypt('Demo123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}',jsonb_build_object('first_name',a.name,'intended_role','student'),now(),now(),'','','','')on conflict(id)do nothing;
insert into auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)values(a.id::text,a.id,jsonb_build_object('sub',a.id::text,'email',a.email),'email',now(),now(),now())on conflict(provider_id,provider)do nothing;
delete from public.user_roles where user_id=a.id;insert into public.user_roles(user_id,role_id)select a.id,id from public.roles where code=a.role_code;
if a.role_code='parent' then delete from public.student_profiles where user_id=a.id;insert into public.parent_profiles(user_id)values(a.id)on conflict do nothing;elsif a.role_code='teacher' then delete from public.student_profiles where user_id=a.id;insert into public.teacher_profiles(user_id)values(a.id)on conflict do nothing;elsif a.role_code='curator' then delete from public.student_profiles where user_id=a.id;insert into public.curator_profiles(user_id)values(a.id)on conflict do nothing;elsif a.role_code='admin' then delete from public.student_profiles where user_id=a.id;end if;end loop;end$$;
update public.student_profiles set grade=11,onboarding_status='completed' where user_id='11111111-1111-4111-8111-111111111111';
insert into public.exam_types(code,name)values('ege','ЕГЭ'),('oge','ОГЭ')on conflict do nothing;
insert into public.subjects(exam_type_id,code,name)select id,'math-profile','Профильная математика'from public.exam_types where code='ege'on conflict do nothing;
insert into public.subjects(exam_type_id,code,name)select id,'russian','Русский язык'from public.exam_types where code='ege'on conflict do nothing;
insert into public.subjects(exam_type_id,code,name)
select e.id, v.code, v.name from public.exam_types e cross join (values
('math-base','Базовая математика'),('physics','Физика'),('social','Обществознание'),
('history','История'),('biology','Биология'),('chemistry','Химия'),('informatics','Информатика'),('english','Английский язык'),('literature','Литература')
) v(code,name) where e.code='ege' on conflict do nothing;
insert into public.subjects(exam_type_id,code,name)
select e.id, v.code, v.name from public.exam_types e cross join (values
('russian','Русский язык'),('math','Математика'),('physics','Физика'),('social','Обществознание'),
('history','История'),('biology','Биология'),('chemistry','Химия'),('informatics','Информатика'),('english','Английский язык'),('literature','Литература'),('geography','География')
) v(code,name) where e.code='oge' on conflict do nothing;
insert into public.exam_scoring_rules(exam_type_id,subject_id,min_score,max_score,unit,label,source_year,source_url)
select e.id,s.id,0,v.max_score,'primary_score','Первичный балл',2026,'https://doc.fipi.ru/oge/normativno-pravovye-dokumenty/04-44_18.02.2026.pdf'
from public.exam_types e join public.subjects s on s.exam_type_id=e.id join(values
('russian',37),('math',31),('physics',39),('chemistry',38),('biology',47),('geography',31),('social',37),('history',37),('literature',40),('informatics',21),('english',68)
)v(code,max_score)on v.code=s.code where e.code='oge'
on conflict(exam_type_id,subject_id)do update set max_score=excluded.max_score,source_year=excluded.source_year,source_url=excluded.source_url;
insert into public.plans(code,name,base_price_minor)values('basic','Базовый',699000),('curator','С куратором',999000),('maximum','Максимальный',1499000)on conflict do nothing;

insert into public.plan_subject_limits(plan_id,max_subjects)
select id,case code when'basic'then 2 when'curator'then 3 else 4 end from public.plans
where code in('basic','curator','maximum') on conflict(plan_id)do update set max_subjects=excluded.max_subjects;

insert into public.plan_features(plan_id,feature_code,enabled,limit_value)
select p.id,f.code,true,f.limit_value from public.plans p join lateral(values
('lessons',null::int),('materials',null),('homework',null),('mock_exams',2)
)f(code,limit_value)on true where p.code in('basic','curator','maximum') on conflict(plan_id,feature_code)do update set enabled=true,limit_value=excluded.limit_value;
insert into public.plan_features(plan_id,feature_code,enabled,limit_value)
select p.id,f.code,true,f.limit_value from public.plans p join lateral(values
('curator',null::int),('parent_reports',4)
)f(code,limit_value)on true where p.code in('curator','maximum') on conflict(plan_id,feature_code)do update set enabled=true,limit_value=excluded.limit_value;
insert into public.plan_features(plan_id,feature_code,enabled,limit_value)
select p.id,f.code,true,null::int from public.plans p join lateral(values
('individual_plan'),('career_guidance'),('admission_help')
)f(code)on true where p.code='maximum' on conflict(plan_id,feature_code)do update set enabled=true;

-- Incomplete student: resumes at the exam choice after signing in.
update public.profiles set first_name='Саша',last_name='Иванов',phone='+79990000006',city='Якутск',timezone='Asia/Yakutsk',preferred_contact_method='email'
where id='66666666-6666-4666-8666-666666666666';
update public.student_profiles set birth_date='2010-03-14',grade=10,school='Школа № 7',onboarding_status='in_progress',onboarding_completed_at=null
where user_id='66666666-6666-4666-8666-666666666666';
insert into public.student_onboarding(student_id,current_step)
values('66666666-6666-4666-8666-666666666666',2)
on conflict(student_id)do update set current_step=2,completed_at=null,completion_key=null;

-- Completed student: real profile, subject and draft plan. The local learning slice below simulates manual activation.
update public.profiles set first_name='Лена',last_name='Смирнова',phone='+79990000001',city='Москва',timezone='Europe/Moscow',preferred_contact_method='email'
where id='11111111-1111-4111-8111-111111111111';
update public.student_profiles set birth_date='2009-05-20',grade=11,school='Школа № 125',onboarding_status='completed',onboarding_completed_at=now()
where user_id='11111111-1111-4111-8111-111111111111';
insert into public.student_onboarding(student_id,exam_type_id,selected_plan_id,current_step,completed_at,completion_key)
select '11111111-1111-4111-8111-111111111111',e.id,p.id,8,now(),'77777777-7777-4777-8777-777777777777'
from public.exam_types e,public.plans p where e.code='ege'and p.code='basic'
on conflict(student_id)do update set exam_type_id=excluded.exam_type_id,selected_plan_id=excluded.selected_plan_id,current_step=8,completed_at=excluded.completed_at,completion_key=excluded.completion_key;
insert into public.student_subjects(student_id,subject_id,current_grade,self_reported_last_mock_score,confidence,target_score,weak_topics,student_comment,score_unit,status)
select '11111111-1111-4111-8111-111111111111',s.id,4,null,6,85,array['Сочинение'],null,'test_score','active'
from public.subjects s join public.exam_types e on e.id=s.exam_type_id where e.code='ege'and s.code='russian'
on conflict(student_id,subject_id)do update set current_grade=4,target_score=85,status='active';
insert into public.admission_goals(student_id,institution_type,institution_name,direction_name,city,desired_score,priority,funding_type,status,minimum_passing_score,needs_admission_help,needs_career_guidance)
values('11111111-1111-4111-8111-111111111111','university','МГУ','Экономика','Москва',260,1,'budget','active',250,true,false)
on conflict do nothing;
insert into public.student_study_preferences(student_id,weekly_hours,preferred_format,strict_control,daily_reminders,current_weekly_load,desired_start_date,timezone)
values('11111111-1111-4111-8111-111111111111',8,'group',false,true,30,current_date,'Europe/Moscow')
on conflict(student_id)do update set weekly_hours=excluded.weekly_hours;
insert into public.preferred_schedule_slots(student_id,weekday,starts_at,ends_at,timezone)
values('11111111-1111-4111-8111-111111111111',2,'17:00','19:00','Europe/Moscow')on conflict do nothing;
insert into public.onboarding_parent_drafts(student_id,invite_requested)
values('11111111-1111-4111-8111-111111111111',false)on conflict(student_id)do nothing;
insert into public.subscriptions(student_id,plan_id,status,price_minor,source,created_by,onboarding_completion_key)
select '11111111-1111-4111-8111-111111111111',p.id,'pending',p.base_price_minor,'manual','11111111-1111-4111-8111-111111111111','77777777-7777-4777-8777-777777777777'
from public.plans p where p.code='basic' on conflict(onboarding_completion_key)do update set updated_at=now();
insert into public.subscription_subjects(subscription_id,subject_id)
select sub.id,ss.subject_id from public.subscriptions sub join public.student_subjects ss on ss.student_id=sub.student_id
where sub.onboarding_completion_key='77777777-7777-4777-8777-777777777777'on conflict do nothing;
insert into public.student_learning_plans(student_id,subscription_id,status,starts_on)
select sub.student_id,sub.id,'draft',current_date from public.subscriptions sub
where sub.onboarding_completion_key='77777777-7777-4777-8777-777777777777'on conflict(student_id,subscription_id)do nothing;

-- Explicit local demo learning slice. It is never applied to production.
update public.subscriptions
set status='active',starts_at=now()-interval '1 day',ends_at=now()+interval '9 months',updated_at=now()
where onboarding_completion_key='77777777-7777-4777-8777-777777777777';

insert into public.programs(id,subject_id,title,status)
select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',s.id,'Демо: ЕГЭ по русскому языку','published'
from public.subjects s join public.exam_types e on e.id=s.exam_type_id
where e.code='ege'and s.code='russian'
on conflict(id)do update set subject_id=excluded.subject_id,title=excluded.title,status='published',updated_at=now();

insert into public.modules(id,program_id,title,position)
values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Демо-модуль: работа с текстом',1)
on conflict(id)do update set title=excluded.title,position=excluded.position,updated_at=now();
insert into public.topics(id,module_id,title,position)
values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Демо-тема: структура сочинения',1)
on conflict(id)do update set title=excluded.title,position=excluded.position,updated_at=now();

insert into public.groups(id,program_id,name,timezone,status)
values('dddddddd-dddd-4ddd-8ddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Демо-группа РУ-01','Europe/Moscow','active')
on conflict(id)do update set program_id=excluded.program_id,name=excluded.name,timezone=excluded.timezone,status='active',updated_at=now();
insert into public.group_students(group_id,student_id,left_at)
values('dddddddd-dddd-4ddd-8ddd-dddddddddddd','11111111-1111-4111-8111-111111111111',null)
on conflict(group_id,student_id)do update set left_at=null,updated_at=now();
insert into public.group_teachers(group_id,teacher_id)
values('dddddddd-dddd-4ddd-8ddd-dddddddddddd','33333333-3333-4333-8333-333333333333')
on conflict do nothing;
insert into public.curator_students(curator_id,student_id,active_to)
values('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111',null)
on conflict(curator_id,student_id)do update set active_to=null,updated_at=now();
insert into public.parent_student_links(parent_id,student_id,relation,status,confirmed_at)
values('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Мама','confirmed',now())
on conflict(parent_id,student_id)do update set relation=excluded.relation,status='confirmed',confirmed_at=coalesce(public.parent_student_links.confirmed_at,now()),updated_at=now();

insert into public.lessons(id,group_id,subject_id,teacher_id,topic_id,title,description,status,objectives,published_at)
select 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','dddddddd-dddd-4ddd-8ddd-dddddddddddd',s.id,'33333333-3333-4333-8333-333333333333','cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'Демо: как построить аргументацию','Учебная запись создана только локальным seed и показывает реальный сценарий кабинета.','scheduled',array['Выделять позицию автора','Подбирать корректный пример','Проверять логические связи'],now()
from public.subjects s join public.exam_types e on e.id=s.exam_type_id where e.code='ege'and s.code='russian'
on conflict(id)do update set title=excluded.title,description=excluded.description,status='scheduled',objectives=excluded.objectives,published_at=excluded.published_at,updated_at=now();

insert into public.lessons(id,group_id,subject_id,teacher_id,topic_id,title,description,status,objectives,published_at)
select 'ffffffff-ffff-4fff-8fff-ffffffffffff','dddddddd-dddd-4ddd-8ddd-dddddddddddd',s.id,'33333333-3333-4333-8333-333333333333','cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'Демо: анализ исходного текста','Завершённый урок без вымышленной видеозаписи.','completed',array['Определять проблему текста','Формулировать комментарий'],now()-interval '2 days'
from public.subjects s join public.exam_types e on e.id=s.exam_type_id where e.code='ege'and s.code='russian'
on conflict(id)do update set title=excluded.title,description=excluded.description,status='completed',objectives=excluded.objectives,updated_at=now();

insert into public.schedule_events(id,lesson_id,group_id,subject_id,event_type,title,description,starts_at,ends_at,timezone,status)
select '10101010-1010-4010-8010-101010101010','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','dddddddd-dddd-4ddd-8ddd-dddddddddddd',s.id,'live_lesson','Демо: как построить аргументацию','Локальное демонстрационное занятие.',now()+interval '2 hours',now()+interval '3 hours 30 minutes','Europe/Moscow','scheduled'
from public.subjects s join public.exam_types e on e.id=s.exam_type_id where e.code='ege'and s.code='russian'
on conflict(id)do update set starts_at=excluded.starts_at,ends_at=excluded.ends_at,status='scheduled',updated_at=now();
insert into public.schedule_events(id,lesson_id,group_id,subject_id,event_type,title,description,starts_at,ends_at,timezone,status)
select '20202020-2020-4020-8020-202020202020','ffffffff-ffff-4fff-8fff-ffffffffffff','dddddddd-dddd-4ddd-8ddd-dddddddddddd',s.id,'live_lesson','Демо: анализ исходного текста','Локальное завершённое занятие.',now()-interval '2 days',now()-interval '2 days'+interval '90 minutes','Europe/Moscow','completed'
from public.subjects s join public.exam_types e on e.id=s.exam_type_id where e.code='ege'and s.code='russian'
on conflict(id)do update set starts_at=excluded.starts_at,ends_at=excluded.ends_at,status='completed',updated_at=now();

insert into public.materials(id,owner_id,title,description,material_type,external_url,published_at)
values('abababab-abab-4bab-8bab-abababababab','33333333-3333-4333-8333-333333333333','Демо: материалы ФИПИ','Официальная страница демоверсий, спецификаций и кодификаторов.','link','https://fipi.ru/ege/demoversii-specifikacii-kodifikatory',now())
on conflict(id)do update set title=excluded.title,description=excluded.description,external_url=excluded.external_url,published_at=excluded.published_at,deleted_at=null,updated_at=now();
insert into public.lesson_materials(lesson_id,material_id,position,visible_from)
values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','abababab-abab-4bab-8bab-abababababab',1,now())
on conflict(lesson_id,material_id)do update set position=excluded.position,visible_from=excluded.visible_from,updated_at=now();

insert into public.assignments(id,group_id,subject_id,teacher_id,title,due_at,max_score,status)
select 'acacacac-acac-4cac-8cac-acacacacacac','dddddddd-dddd-4ddd-8ddd-dddddddddddd',s.id,'33333333-3333-4333-8333-333333333333','Демо: план сочинения',now()+interval '2 days',10,'published'
from public.subjects s join public.exam_types e on e.id=s.exam_type_id where e.code='ege'and s.code='russian'
on conflict(id)do update set due_at=excluded.due_at,status='published',updated_at=now();
