\set ON_ERROR_STOP on
\pset pager off

create schema if not exists test;
grant usage on schema test to anon, authenticated;

create or replace function test.set_user(who uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', who::text, false);
  perform set_config('request.jwt.claim.role', 'authenticated', false);
end;
$$;

create or replace function test.assert_count(label text, q text, expected bigint)
returns void language plpgsql as $$
declare got bigint;
begin
  execute q into got;
  if got is distinct from expected then
    raise exception 'RLS FAIL: % — expected %, got %', label, expected, got;
  end if;
  raise notice 'RLS OK: % (%)', label, got;
end;
$$;

create or replace function test.assert_uid(expected uuid)
returns void language plpgsql as $$
begin
  if auth.uid() is distinct from expected then
    raise exception 'RLS FAIL: expected auth.uid() %, got %', expected, auth.uid();
  end if;
end;
$$;

grant execute on all functions in schema test to anon, authenticated;

insert into auth.users(id,email,raw_user_meta_data) values
 ('11111111-1111-4111-8111-111111111111','s1@t','{"intended_role":"student","first_name":"S1"}'),
 ('22222222-2222-4222-8222-222222222222','s2@t','{"intended_role":"student","first_name":"S2"}'),
 ('33333333-3333-4333-8333-333333333333','p1@t','{"intended_role":"parent","first_name":"P1"}'),
 ('44444444-4444-4444-8444-444444444444','t1@t','{"intended_role":"student","first_name":"T1"}'),
 ('55555555-5555-4555-8555-555555555555','c1@t','{"intended_role":"student","first_name":"C1"}'),
 ('66666666-6666-4666-8666-666666666666','c2@t','{"intended_role":"student","first_name":"C2"}'),
 ('77777777-7777-4777-8777-777777777777','p2@t','{"intended_role":"parent","first_name":"P2"}'),
 ('88888888-8888-4888-8888-888888888888','admin@t','{"intended_role":"student","first_name":"Admin"}');

insert into public.teacher_profiles(user_id) values('44444444-4444-4444-8444-444444444444');
insert into public.curator_profiles(user_id) values
 ('55555555-5555-4555-8555-555555555555'),
 ('66666666-6666-4666-8666-666666666666');
delete from public.user_roles where user_id in (
 '44444444-4444-4444-8444-444444444444',
 '55555555-5555-4555-8555-555555555555',
 '66666666-6666-4666-8666-666666666666',
 '88888888-8888-4888-8888-888888888888'
);
insert into public.user_roles(user_id,role_id) select '44444444-4444-4444-8444-444444444444',id from public.roles where code='teacher';
insert into public.user_roles(user_id,role_id) select '55555555-5555-4555-8555-555555555555',id from public.roles where code='curator';
insert into public.user_roles(user_id,role_id) select '66666666-6666-4666-8666-666666666666',id from public.roles where code='curator';
insert into public.user_roles(user_id,role_id) select '88888888-8888-4888-8888-888888888888',id from public.roles where code='admin';

insert into public.parent_student_links(parent_id,student_id,relation,status)
values('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','mother','pending');

insert into public.subjects(id,exam_type_id,code,name)
select 'bbbbbbbb-0000-4000-8000-000000000001',id,'math_rlstest','Математика RLS'
from public.exam_types where code='ege' limit 1;

insert into public.programs(id,subject_id,title,status) values
 ('cccccccc-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000001','Опубликованная','published'),
 ('cccccccc-0000-4000-8000-000000000002','bbbbbbbb-0000-4000-8000-000000000001','Черновик','draft');
insert into public.modules(id,program_id,title,position) values
 ('eeeeeeee-0000-4000-8000-000000000001','cccccccc-0000-4000-8000-000000000001','Опубликованный модуль',1),
 ('eeeeeeee-0000-4000-8000-000000000002','cccccccc-0000-4000-8000-000000000002','Черновой модуль',1);
insert into public.topics(id,module_id,title,position) values
 ('ffffffff-0000-4000-8000-000000000001','eeeeeeee-0000-4000-8000-000000000001','Опубликованная тема',1),
 ('ffffffff-0000-4000-8000-000000000002','eeeeeeee-0000-4000-8000-000000000002','Черновая тема',1);

insert into public.groups(id,program_id,name) values
 ('dddddddd-0000-4000-8000-00000000000a','cccccccc-0000-4000-8000-000000000001','Группа A'),
 ('dddddddd-0000-4000-8000-00000000000b','cccccccc-0000-4000-8000-000000000001','Группа B'),
 ('dddddddd-0000-4000-8000-00000000000c','cccccccc-0000-4000-8000-000000000002','Черновая группа C');
insert into public.group_students(group_id,student_id) values
 ('dddddddd-0000-4000-8000-00000000000a','11111111-1111-4111-8111-111111111111'),
 ('dddddddd-0000-4000-8000-00000000000b','22222222-2222-4222-8222-222222222222');
insert into public.group_teachers(group_id,teacher_id) values
 ('dddddddd-0000-4000-8000-00000000000a','44444444-4444-4444-8444-444444444444'),
 ('dddddddd-0000-4000-8000-00000000000c','44444444-4444-4444-8444-444444444444');
insert into public.curator_students(curator_id,student_id)
values('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111');

insert into public.plans(id,code,name,base_price_minor)
values('aaaaaaaa-0000-4000-8000-000000000001','rls_test','RLS test',10000);
insert into public.subscriptions(id,student_id,plan_id,status,price_minor)
values('aaaaaaaa-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','aaaaaaaa-0000-4000-8000-000000000001','active',10000);
insert into public.subscription_subjects(subscription_id,subject_id)
values('aaaaaaaa-0000-4000-8000-000000000002','bbbbbbbb-0000-4000-8000-000000000001');

reset request.jwt.claim.sub;
set role anon;
select test.assert_count('anon no subscription subjects','select count(*) from public.subscription_subjects',0);
select test.assert_count('anon published program','select count(*) from public.programs where id=''cccccccc-0000-4000-8000-000000000001''',1);
select test.assert_count('anon no draft program','select count(*) from public.programs where id=''cccccccc-0000-4000-8000-000000000002''',0);
select test.assert_count('anon published module','select count(*) from public.modules where id=''eeeeeeee-0000-4000-8000-000000000001''',1);
select test.assert_count('anon published topic','select count(*) from public.topics where id=''ffffffff-0000-4000-8000-000000000001''',1);
reset role;

set role authenticated;
select test.set_user('11111111-1111-4111-8111-111111111111');
select test.assert_count('student no foreign profile','select count(*) from public.student_profiles where user_id=''22222222-2222-4222-8222-222222222222''',0);
select test.assert_count('student own profile','select count(*) from public.student_profiles where user_id=''11111111-1111-4111-8111-111111111111''',1);
select test.assert_count('student own subscription subjects','select count(*) from public.subscription_subjects where subscription_id=''aaaaaaaa-0000-4000-8000-000000000002''',1);
select test.assert_count('student published program','select count(*) from public.programs where id=''cccccccc-0000-4000-8000-000000000001''',1);
select test.assert_count('student no draft module','select count(*) from public.modules where id=''eeeeeeee-0000-4000-8000-000000000002''',0);
select test.assert_count('student no draft topic','select count(*) from public.topics where id=''ffffffff-0000-4000-8000-000000000002''',0);

select test.set_user('33333333-3333-4333-8333-333333333333');
select test.assert_count('pending parent no child','select count(*) from public.student_profiles where user_id=''11111111-1111-4111-8111-111111111111''',0);
select test.assert_count('pending parent no subscription subjects','select count(*) from public.subscription_subjects where subscription_id=''aaaaaaaa-0000-4000-8000-000000000002''',0);
reset role;

update public.parent_student_links set status='confirmed',confirmed_at=now()
where parent_id='33333333-3333-4333-8333-333333333333' and student_id='11111111-1111-4111-8111-111111111111';
set role authenticated;
select test.set_user('33333333-3333-4333-8333-333333333333');
select test.assert_count('confirmed parent child','select count(*) from public.student_profiles where user_id=''11111111-1111-4111-8111-111111111111''',1);
select test.assert_count('confirmed parent subscription subjects','select count(*) from public.subscription_subjects where subscription_id=''aaaaaaaa-0000-4000-8000-000000000002''',1);

select test.set_user('77777777-7777-4777-8777-777777777777');
select test.assert_count('unrelated parent no subscription subjects','select count(*) from public.subscription_subjects where subscription_id=''aaaaaaaa-0000-4000-8000-000000000002''',0);

select test.set_user('44444444-4444-4444-8444-444444444444');
select test.assert_count('teacher own group','select count(*) from public.group_students where group_id=''dddddddd-0000-4000-8000-00000000000a''',1);
select test.assert_count('teacher no foreign group','select count(*) from public.group_students where group_id=''dddddddd-0000-4000-8000-00000000000b''',0);
select test.assert_count('teacher assigned draft program','select count(*) from public.programs where id=''cccccccc-0000-4000-8000-000000000002''',1);
select test.assert_count('teacher assigned draft module','select count(*) from public.modules where id=''eeeeeeee-0000-4000-8000-000000000002''',1);
select test.assert_count('teacher assigned draft topic','select count(*) from public.topics where id=''ffffffff-0000-4000-8000-000000000002''',1);

select test.set_user('55555555-5555-4555-8555-555555555555');
select test.assert_count('curator own assignment','select count(*) from public.curator_students',1);
select test.assert_count('curator no unassigned student','select count(*) from public.student_profiles where user_id=''22222222-2222-4222-8222-222222222222''',0);
select test.assert_count('curator assigned subscription subjects','select count(*) from public.subscription_subjects where subscription_id=''aaaaaaaa-0000-4000-8000-000000000002''',1);
select test.assert_count('curator no subscription financial row','select count(*) from public.subscriptions where id=''aaaaaaaa-0000-4000-8000-000000000002''',0);

select test.set_user('66666666-6666-4666-8666-666666666666');
select test.assert_count('unrelated curator no subscription subjects','select count(*) from public.subscription_subjects where subscription_id=''aaaaaaaa-0000-4000-8000-000000000002''',0);

select test.set_user('88888888-8888-4888-8888-888888888888');
select test.assert_count('admin subscription subjects','select count(*) from public.subscription_subjects where subscription_id=''aaaaaaaa-0000-4000-8000-000000000002''',1);

select test.set_user('44444444-4444-4444-8444-444444444444');
insert into public.lessons(id,group_id,subject_id,teacher_id,topic_id,title,status,published_at)
values('90000000-0000-4000-8000-000000000001','dddddddd-0000-4000-8000-00000000000a','bbbbbbbb-0000-4000-8000-000000000001','44444444-4444-4444-8444-444444444444','ffffffff-0000-4000-8000-000000000001','Авторский урок','scheduled',now());
insert into public.question_bank(id,subject_id,topic_id,author_id,prompt,difficulty,status)
values('91000000-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000001','ffffffff-0000-4000-8000-000000000001','44444444-4444-4444-8444-444444444444','Решите авторское задание',2,'published');
insert into public.question_answers(question_id,answer)
values('91000000-0000-4000-8000-000000000001','Секретный ответ');
insert into public.assignments(id,lesson_id,group_id,subject_id,teacher_id,title,due_at,max_score,status)
values('92000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','dddddddd-0000-4000-8000-00000000000a','bbbbbbbb-0000-4000-8000-000000000001','44444444-4444-4444-8444-444444444444','Авторское ДЗ',now()+interval '2 days',10,'published');
insert into public.assignment_questions(assignment_id,question_id,position)
values('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001',0);
select test.assert_count('teacher creates lesson in assigned group','select count(*) from public.lessons where id=''90000000-0000-4000-8000-000000000001''',1);
select test.assert_count('teacher creates scoped question','select count(*) from public.question_bank where id=''91000000-0000-4000-8000-000000000001''',1);

\set ON_ERROR_STOP off
insert into public.lessons(id,group_id,subject_id,teacher_id,title,status)
values('94000000-0000-4000-8000-000000000001','dddddddd-0000-4000-8000-00000000000b','bbbbbbbb-0000-4000-8000-000000000001','44444444-4444-4444-8444-444444444444','Чужая группа','scheduled');
\set ON_ERROR_STOP on
select test.assert_count('teacher cannot create lesson in foreign group','select count(*) from public.lessons where id=''94000000-0000-4000-8000-000000000001''',0);

select test.set_user('55555555-5555-4555-8555-555555555555');
select test.assert_count('assigned curator reads assigned lesson','select count(*) from public.lessons where id=''90000000-0000-4000-8000-000000000001''',1);
select test.assert_count('assigned curator reads assigned assignment','select count(*) from public.assignments where id=''92000000-0000-4000-8000-000000000001''',1);
\set ON_ERROR_STOP off
insert into public.lessons(id,group_id,subject_id,teacher_id,title,status)
values('93000000-0000-4000-8000-000000000001','dddddddd-0000-4000-8000-00000000000a','bbbbbbbb-0000-4000-8000-000000000001','44444444-4444-4444-8444-444444444444','Урок куратора','scheduled');
update public.lessons set title='Куратор изменил урок' where id='90000000-0000-4000-8000-000000000001';
delete from public.lessons where id='90000000-0000-4000-8000-000000000001';
\set ON_ERROR_STOP on
select test.assert_count('assigned curator cannot create lesson','select count(*) from public.lessons where id=''93000000-0000-4000-8000-000000000001''',0);
select test.assert_count('assigned curator cannot update lesson','select count(*) from public.lessons where id=''90000000-0000-4000-8000-000000000001'' and title=''Авторский урок''',1);
select test.assert_count('assigned curator cannot delete lesson','select count(*) from public.lessons where id=''90000000-0000-4000-8000-000000000001''',1);

select test.set_user('66666666-6666-4666-8666-666666666666');
\set ON_ERROR_STOP off
insert into public.lessons(id,group_id,subject_id,teacher_id,title,status)
values('94000000-0000-4000-8000-000000000002','dddddddd-0000-4000-8000-00000000000a','bbbbbbbb-0000-4000-8000-000000000001','44444444-4444-4444-8444-444444444444','Чужой куратор','scheduled');
\set ON_ERROR_STOP on
select test.assert_count('unrelated curator cannot create lesson','select count(*) from public.lessons where id=''94000000-0000-4000-8000-000000000002''',0);

select test.set_user('11111111-1111-4111-8111-111111111111');
select test.assert_count('student reads assigned question prompt','select count(*) from public.question_bank where id=''91000000-0000-4000-8000-000000000001''',1);
select test.assert_count('student cannot read question answer','select count(*) from public.question_answers where question_id=''91000000-0000-4000-8000-000000000001''',0);

select test.set_user('22222222-2222-4222-8222-222222222222');
select test.assert_count('foreign student cannot read question','select count(*) from public.question_bank where id=''91000000-0000-4000-8000-000000000001''',0);

reset role;
insert into public.subscriptions(id,student_id,plan_id,status,price_minor)
values('aaaaaaaa-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','aaaaaaaa-0000-4000-8000-000000000001','pending',10000);
set role authenticated;
select test.set_user('11111111-1111-4111-8111-111111111111');
select * from public.prepare_subscription_payment('aaaaaaaa-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001');
select test.assert_count('payment amount comes from pending subscription','select count(*) from public.payments where subscription_id=''aaaaaaaa-0000-4000-8000-000000000003'' and amount_minor=10000 and status=''pending''',1);
select public.attach_yookassa_payment(
  (select id from public.payments where subscription_id='aaaaaaaa-0000-4000-8000-000000000003'),
  'provider_payment_test_001',
  '{"status":"pending"}'::jsonb
);
reset role;
set role service_role;
select public.finalize_yookassa_payment('provider_payment_test_001','succeeded',10000,'RUB','{"status":"succeeded"}'::jsonb);
reset role;
select test.assert_count('verified webhook activates pending subscription','select count(*) from public.subscriptions where id=''aaaaaaaa-0000-4000-8000-000000000003'' and status=''active'' and source=''yookassa''',1);

set role authenticated;
select test.set_user('11111111-1111-4111-8111-111111111111');
select test.assert_uid('11111111-1111-4111-8111-111111111111');
\set ON_ERROR_STOP off
insert into public.user_roles(user_id,role_id)
select '11111111-1111-4111-8111-111111111111',id from public.roles where code='admin';
\set ON_ERROR_STOP on
select test.assert_count('student cannot assign admin','select count(*) from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.user_id=''11111111-1111-4111-8111-111111111111'' and r.code=''admin''',0);

reset role;

do $$
begin
  if has_function_privilege('anon', 'public.record_auth_rate_limit_attempt(text,text[])', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.clear_auth_rate_limit(text,text[])', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.record_auth_rate_limit_attempt(text,text[])', 'EXECUTE')
  then
    raise exception 'RATE LIMIT FAIL: RPC privileges are not service-role only';
  end if;
end;
$$;

set role service_role;
select public.record_auth_rate_limit_attempt('login', array[repeat('a', 64)]);
select public.record_auth_rate_limit_attempt('login', array[repeat('a', 64)]);
select public.record_auth_rate_limit_attempt('login', array[repeat('a', 64)]);
select public.record_auth_rate_limit_attempt('login', array[repeat('a', 64)]);
select public.record_auth_rate_limit_attempt('login', array[repeat('a', 64)]);
do $$
declare result record;
begin
  select * into result from public.check_auth_rate_limit('login', array[repeat('a', 64)]);
  if result.allowed or result.retry_after_seconds <= 0 then
    raise exception 'RATE LIMIT FAIL: five login failures must block';
  end if;
end;
$$;
reset role;

update private.auth_rate_limits
set blocked_until = clock_timestamp() - interval '1 second',
    window_started_at = clock_timestamp() - interval '16 minutes'
where action = 'login' and identifier_hash = repeat('a', 64);

set role service_role;
do $$
declare result record;
begin
  select * into result from public.check_auth_rate_limit('login', array[repeat('a', 64)]);
  if not result.allowed then
    raise exception 'RATE LIMIT FAIL: expired block must clear automatically';
  end if;
end;
$$;
reset role;

insert into public.student_onboarding(student_id, exam_type_id, current_step)
select '11111111-1111-4111-8111-111111111111', id, 3
from public.exam_types where code = 'ege'
on conflict (student_id) do update set exam_type_id = excluded.exam_type_id, current_step = 3, completed_at = null;

set role authenticated;
select test.set_user('11111111-1111-4111-8111-111111111111');
select public.replace_onboarding_subjects('[{"subject_id":"bbbbbbbb-0000-4000-8000-000000000001","current_grade":5,"last_mock_score":20,"confidence":6,"target_score":80,"weak_topics":["аргументация"],"comment":"сохранить","score_unit":"test_score"}]'::jsonb);
\set ON_ERROR_STOP off
select public.replace_onboarding_subjects('[{"subject_id":"bbbbbbbb-0000-4000-8000-000000000001","current_grade":9,"last_mock_score":20,"confidence":6,"target_score":80,"weak_topics":[],"comment":"сломать","score_unit":"test_score"}]'::jsonb);
\set ON_ERROR_STOP on
select test.assert_count('subject draft rollback keeps prior row','select count(*) from public.student_subjects where student_id=''11111111-1111-4111-8111-111111111111'' and current_grade=5 and student_comment=''сохранить''',1);

select public.replace_onboarding_goals('[{"institution_type":"university","institution_name":"Тестовый вуз","direction_name":"Филология","city":"Москва","funding_type":"budget","priority":1,"minimum_passing_score":70,"desired_score":85,"needs_admission_help":true,"needs_career_guidance":false}]'::jsonb);
\set ON_ERROR_STOP off
select public.replace_onboarding_goals('[{"institution_type":"university","institution_name":null,"direction_name":"Филология","city":"Москва","funding_type":"budget","priority":1,"minimum_passing_score":70,"desired_score":85,"needs_admission_help":true,"needs_career_guidance":false}]'::jsonb);
\set ON_ERROR_STOP on
select test.assert_count('goal draft rollback keeps prior row','select count(*) from public.admission_goals where student_id=''11111111-1111-4111-8111-111111111111'' and institution_name=''Тестовый вуз'' and status=''active''',1);

select public.replace_onboarding_schedule(
  '{"weekly_hours":6,"preferred_format":"group","strict_control":false,"daily_reminders":true,"other_courses":null,"current_weekly_load":20,"desired_start_date":"2026-09-01","timezone":"Europe/Moscow"}'::jsonb,
  '[{"weekday":2,"starts_at":"17:00","ends_at":"19:00","timezone":"Europe/Moscow"}]'::jsonb
);
\set ON_ERROR_STOP off
select public.replace_onboarding_schedule(
  '{"weekly_hours":9,"preferred_format":"group","strict_control":false,"daily_reminders":true,"other_courses":null,"current_weekly_load":20,"desired_start_date":"2026-09-01","timezone":"Europe/Moscow"}'::jsonb,
  '[{"weekday":2,"starts_at":"20:00","ends_at":"19:00","timezone":"Europe/Moscow"}]'::jsonb
);
\set ON_ERROR_STOP on
select test.assert_count('schedule draft rollback keeps prior preferences','select count(*) from public.student_study_preferences where student_id=''11111111-1111-4111-8111-111111111111'' and weekly_hours=6',1);
select test.assert_count('schedule draft rollback keeps prior slot','select count(*) from public.preferred_schedule_slots where student_id=''11111111-1111-4111-8111-111111111111'' and starts_at=''17:00''::time and ends_at=''19:00''::time',1);
reset role;

set role authenticated;
select test.set_user('11111111-1111-4111-8111-111111111111');
select public.start_student_lesson('90000000-0000-4000-8000-000000000001',37);
select public.start_student_lesson('90000000-0000-4000-8000-000000000001');
select test.assert_count('lesson start and position are persisted once','select count(*) from public.student_lesson_progress where user_id=''11111111-1111-4111-8111-111111111111'' and lesson_id=''90000000-0000-4000-8000-000000000001'' and status=''started'' and last_position_seconds=37',1);
select test.assert_count('lesson start activity is idempotent','select count(*) from public.student_activity where user_id=''11111111-1111-4111-8111-111111111111'' and activity_type=''lesson_started'' and source_id=''90000000-0000-4000-8000-000000000001''',1);
select public.complete_student_lesson('90000000-0000-4000-8000-000000000001');
select test.assert_count('lesson completion creates course progress','select count(*) from public.student_progress where user_id=''11111111-1111-4111-8111-111111111111'' and course_id=''cccccccc-0000-4000-8000-000000000001'' and completed_lessons=1',1);
insert into public.student_weekly_goals(user_id,week_starts_on,target_points) values('11111111-1111-4111-8111-111111111111',date_trunc('week',current_date)::date,10);
select test.assert_count('student stores own weekly goal','select count(*) from public.student_weekly_goals where user_id=''11111111-1111-4111-8111-111111111111'' and target_points=10',1);
select public.start_student_homework('92000000-0000-4000-8000-000000000001');
select public.start_student_homework('92000000-0000-4000-8000-000000000001');
select test.assert_count('homework start is persisted once','select count(*) from public.assignment_submissions where assignment_id=''92000000-0000-4000-8000-000000000001'' and student_id=''11111111-1111-4111-8111-111111111111'' and status=''in_progress''',1);
select test.assert_count('homework start activity is idempotent','select count(*) from public.student_activity where user_id=''11111111-1111-4111-8111-111111111111'' and activity_type=''homework_started'' and source_id=''92000000-0000-4000-8000-000000000001''',1);
select public.submit_student_homework('92000000-0000-4000-8000-000000000001','{"text":"Проверяемый ответ ученика"}'::jsonb);
select test.assert_count('homework action persists own answer','select count(*) from public.assignment_submissions where assignment_id=''92000000-0000-4000-8000-000000000001'' and answer->>''text''=''Проверяемый ответ ученика''',1);
reset role;

set role authenticated;
select test.set_user('22222222-2222-4222-8222-222222222222');
select test.assert_count('foreign student cannot read weekly goal','select count(*) from public.student_weekly_goals where user_id=''11111111-1111-4111-8111-111111111111''',0);
\set ON_ERROR_STOP off
select public.start_student_lesson('90000000-0000-4000-8000-000000000001');
select public.start_student_homework('92000000-0000-4000-8000-000000000001');
select public.complete_student_lesson('90000000-0000-4000-8000-000000000001');
select public.submit_student_homework('92000000-0000-4000-8000-000000000001','{"text":"Чужой ответ"}'::jsonb);
\set ON_ERROR_STOP on
select test.assert_count('foreign lesson action leaves legitimate progress unchanged','select count(*) from public.student_progress where user_id=''22222222-2222-4222-8222-222222222222'' and course_id=''cccccccc-0000-4000-8000-000000000001'' and completed_lessons=0 and last_activity_at is null',1);
select test.assert_count('foreign lesson start creates no lesson progress','select count(*) from public.student_lesson_progress where user_id=''22222222-2222-4222-8222-222222222222'' and lesson_id=''90000000-0000-4000-8000-000000000001''',0);
select test.assert_count('foreign starts create no activity','select count(*) from public.student_activity where user_id=''22222222-2222-4222-8222-222222222222'' and source_id in (''90000000-0000-4000-8000-000000000001'',''92000000-0000-4000-8000-000000000001'') and activity_type in (''lesson_started'',''homework_started'')',0);
select test.assert_count('foreign homework action creates no submission','select count(*) from public.assignment_submissions where student_id=''22222222-2222-4222-8222-222222222222'' and assignment_id=''92000000-0000-4000-8000-000000000001''',0);
reset role;

insert into public.diagnostics(user_id,subject,questions,answers,result,weak_topics,recommendations)
values('11111111-1111-4111-8111-111111111111','math','["q1"]','[1]','{"correct":0,"total":1}',array['Алгебра'],array['Разобрать алгебру']);
insert into public.ai_conversations(user_id,context,messages)
values('11111111-1111-4111-8111-111111111111','{"goal":"ЕГЭ"}','[{"role":"user","content":"private"}]');

set role authenticated;
select test.set_user('33333333-3333-4333-8333-333333333333');
select test.assert_count('parent cannot read homework answer','select count(*) from public.assignment_submissions where student_id=''11111111-1111-4111-8111-111111111111''',0);
select test.assert_count('parent cannot read diagnostics','select count(*) from public.diagnostics where user_id=''11111111-1111-4111-8111-111111111111''',0);
select test.assert_count('parent cannot read AI conversations','select count(*) from public.ai_conversations where user_id=''11111111-1111-4111-8111-111111111111''',0);
select test.assert_count('confirmed parent sees safe progress view','select count(*) from public.parent_progress_view where student_id=''11111111-1111-4111-8111-111111111111''',1);
reset role;

select 'RLS integration suite passed';
