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

create or replace function test.assert_sqlstate(label text, q text, expected text)
returns void language plpgsql as $$
declare got text;
begin
  begin
    execute q;
  exception when others then
    got := sqlstate;
  end;
  if got is distinct from expected then
    raise exception 'RLS FAIL: % — expected SQLSTATE %, got %', label, expected, coalesce(got, 'success');
  end if;
  raise notice 'RLS OK: % (SQLSTATE %)', label, got;
end;
$$;

grant execute on all functions in schema test to anon, authenticated;

insert into auth.users(id,email,raw_user_meta_data) values
 ('10101010-0000-4000-8000-000000000001','co-student@t','{"intended_role":"student","first_name":"COS"}'),
 ('10101010-0000-4000-8000-000000000002','co-parent@t','{"intended_role":"parent","first_name":"COP"}'),
 ('10101010-0000-4000-8000-000000000003','co-teacher@t','{"intended_role":"student","first_name":"COT"}'),
 ('10101010-0000-4000-8000-000000000004','co-curator@t','{"intended_role":"student","first_name":"COC"}'),
 ('10101010-0000-4000-8000-000000000005','co-other-curator@t','{"intended_role":"student","first_name":"COOC"}'),
 ('10101010-0000-4000-8000-000000000006','co-admin@t','{"intended_role":"student","first_name":"COA"}'),
 ('10101010-0000-4000-8000-000000000007','co-unrelated-parent@t','{"intended_role":"parent","first_name":"COUP"}'),
 ('10101010-0000-4000-8000-000000000008','co-foreign-student@t','{"intended_role":"student","first_name":"COFS"}');

insert into public.teacher_profiles(user_id)
values('10101010-0000-4000-8000-000000000003');
insert into public.curator_profiles(user_id) values
 ('10101010-0000-4000-8000-000000000004'),
 ('10101010-0000-4000-8000-000000000005');
delete from public.user_roles where user_id in (
 '10101010-0000-4000-8000-000000000003',
 '10101010-0000-4000-8000-000000000004',
 '10101010-0000-4000-8000-000000000005',
 '10101010-0000-4000-8000-000000000006'
);
insert into public.user_roles(user_id,role_id) select '10101010-0000-4000-8000-000000000003',id from public.roles where code='teacher';
insert into public.user_roles(user_id,role_id) select '10101010-0000-4000-8000-000000000004',id from public.roles where code='curator';
insert into public.user_roles(user_id,role_id) select '10101010-0000-4000-8000-000000000005',id from public.roles where code='curator';
insert into public.user_roles(user_id,role_id) select '10101010-0000-4000-8000-000000000006',id from public.roles where code='admin';

insert into public.parent_student_links(parent_id,student_id,relation,status,confirmed_at)
values('10101010-0000-4000-8000-000000000002','10101010-0000-4000-8000-000000000001','mother','confirmed',now());

insert into public.subjects(id,exam_type_id,code,name)
select '20202020-0000-4000-8000-000000000001',id,'course_offering_rls','CourseOffering RLS'
from public.exam_types where code='ege' limit 1;

insert into public.programs(id,subject_id,title,status) values
 ('30303030-0000-4000-8000-000000000001','20202020-0000-4000-8000-000000000001','CourseOffering program','published'),
 ('30303030-0000-4000-8000-000000000002','20202020-0000-4000-8000-000000000001','CourseOffering draft','draft');

insert into public.course_offerings(id,academic_year,exam_type_id,subject_id,program_id,starts_at,ends_at,enrollment_status,delivery_model)
select
 '40404040-0000-4000-8000-000000000001',
 '2026/27',
 id,
 '20202020-0000-4000-8000-000000000001',
 '30303030-0000-4000-8000-000000000001',
 now() - interval '1 day',
 now() + interval '330 days',
 'closed',
 'live_group'
from public.exam_types where code='ege' limit 1;

insert into public.course_offerings(id,academic_year,exam_type_id,subject_id,program_id,starts_at,ends_at,enrollment_status,delivery_model)
select
 '40404040-0000-4000-8000-000000000002',
 '2027/28',
 id,
 '20202020-0000-4000-8000-000000000001',
 '30303030-0000-4000-8000-000000000001',
 now() + interval '30 days',
 now() + interval '395 days',
 'open',
 'live_group'
from public.exam_types where code='ege' limit 1;

insert into public.groups(id,program_id,course_offering_id,name) values
 ('50505050-0000-4000-8000-000000000001','30303030-0000-4000-8000-000000000001','40404040-0000-4000-8000-000000000001','CourseOffering group'),
 ('50505050-0000-4000-8000-000000000002','30303030-0000-4000-8000-000000000001',null,'Legacy subject group');
insert into public.group_students(group_id,student_id)
values('50505050-0000-4000-8000-000000000001','10101010-0000-4000-8000-000000000001');
insert into public.group_teachers(group_id,teacher_id)
values('50505050-0000-4000-8000-000000000001','10101010-0000-4000-8000-000000000003');
insert into public.curator_students(curator_id,student_id)
values('10101010-0000-4000-8000-000000000004','10101010-0000-4000-8000-000000000001');

insert into public.plans(id,code,name,base_price_minor)
values('60606060-0000-4000-8000-000000000001','course_offering_rls','CourseOffering RLS',10000);
insert into public.subscriptions(id,student_id,plan_id,status,price_minor)
values('70707070-0000-4000-8000-000000000001','10101010-0000-4000-8000-000000000001','60606060-0000-4000-8000-000000000001','active',10000);
insert into public.subscription_subjects(subscription_id,subject_id)
values('70707070-0000-4000-8000-000000000001','20202020-0000-4000-8000-000000000001');
insert into public.subscription_offerings(subscription_id,course_offering_id)
values('70707070-0000-4000-8000-000000000001','40404040-0000-4000-8000-000000000001');

reset request.jwt.claim.sub;
set role anon;
select test.assert_count('anon reads open course offering','select count(*) from public.course_offerings where id=''40404040-0000-4000-8000-000000000002''',1);
select test.assert_count('anon does not read closed course offering','select count(*) from public.course_offerings where id=''40404040-0000-4000-8000-000000000001''',0);
select test.assert_sqlstate('anon cannot access subscription offerings','select count(*) from public.subscription_offerings where subscription_id=''70707070-0000-4000-8000-000000000001''','42501');
reset role;

set role authenticated;
select test.set_user('10101010-0000-4000-8000-000000000001');
select test.assert_count('student reads subscribed closed offering','select count(*) from public.course_offerings where id=''40404040-0000-4000-8000-000000000001''',1);
select test.assert_count('student reads own subscription offering','select count(*) from public.subscription_offerings where subscription_id=''70707070-0000-4000-8000-000000000001''',1);
select test.set_user('10101010-0000-4000-8000-000000000008');
select test.assert_count('foreign student cannot read closed course offering','select count(*) from public.course_offerings where id=''40404040-0000-4000-8000-000000000001''',0);
select test.assert_count('foreign student cannot read subscription offering','select count(*) from public.subscription_offerings where subscription_id=''70707070-0000-4000-8000-000000000001''',0);
select test.set_user('10101010-0000-4000-8000-000000000001');
\set ON_ERROR_STOP off
update public.course_offerings set enrollment_status='archived'
where id='40404040-0000-4000-8000-000000000001';
\set ON_ERROR_STOP on
select test.assert_count('student cannot update course offering','select count(*) from public.course_offerings where id=''40404040-0000-4000-8000-000000000001'' and enrollment_status=''closed''',1);

select test.set_user('10101010-0000-4000-8000-000000000002');
select test.assert_count('parent reads child subscription offering','select count(*) from public.subscription_offerings where subscription_id=''70707070-0000-4000-8000-000000000001''',1);
select test.set_user('10101010-0000-4000-8000-000000000007');
select test.assert_count('unrelated parent cannot read closed course offering','select count(*) from public.course_offerings where id=''40404040-0000-4000-8000-000000000001''',0);
select test.assert_count('unrelated parent cannot read subscription offering','select count(*) from public.subscription_offerings where subscription_id=''70707070-0000-4000-8000-000000000001''',0);

select test.set_user('10101010-0000-4000-8000-000000000003');
select test.assert_count('teacher reads taught course offering','select count(*) from public.course_offerings where id=''40404040-0000-4000-8000-000000000001''',1);
select test.assert_count('teacher cannot read commercial subscription offering','select count(*) from public.subscription_offerings where subscription_id=''70707070-0000-4000-8000-000000000001''',0);
\set ON_ERROR_STOP off
insert into public.course_offerings(id,academic_year,exam_type_id,subject_id,program_id,starts_at,ends_at,enrollment_status)
select '40404040-0000-4000-8000-000000000003','2028/29',id,'20202020-0000-4000-8000-000000000001','30303030-0000-4000-8000-000000000001',now(),now()+interval '1 year','draft'
from public.exam_types where code='ege' limit 1;
insert into public.subscription_offerings(subscription_id,course_offering_id)
values('70707070-0000-4000-8000-000000000001','40404040-0000-4000-8000-000000000002');
update public.subscription_offerings
set status='inactive'
where subscription_id='70707070-0000-4000-8000-000000000001'
  and course_offering_id='40404040-0000-4000-8000-000000000001';
delete from public.subscription_offerings
where subscription_id='70707070-0000-4000-8000-000000000001'
  and course_offering_id='40404040-0000-4000-8000-000000000001';
\set ON_ERROR_STOP on
select test.assert_count('teacher cannot create course offering','select count(*) from public.course_offerings where id=''40404040-0000-4000-8000-000000000003''',0);
reset role;
select test.assert_count('teacher cannot create commercial subscription mapping','select count(*) from public.subscription_offerings where subscription_id=''70707070-0000-4000-8000-000000000001'' and course_offering_id=''40404040-0000-4000-8000-000000000002''',0);
select test.assert_count('teacher cannot manage commercial subscription mapping','select count(*) from public.subscription_offerings where subscription_id=''70707070-0000-4000-8000-000000000001'' and course_offering_id=''40404040-0000-4000-8000-000000000001'' and status=''active''',1);

set role authenticated;
select test.set_user('10101010-0000-4000-8000-000000000004');
select test.assert_count('curator reads assigned course offering','select count(*) from public.course_offerings where id=''40404040-0000-4000-8000-000000000001''',1);
select test.assert_count('curator reads assigned subscription offering','select count(*) from public.subscription_offerings where subscription_id=''70707070-0000-4000-8000-000000000001''',1);
\set ON_ERROR_STOP off
delete from public.course_offerings where id='40404040-0000-4000-8000-000000000001';
insert into public.subscription_offerings(subscription_id,course_offering_id)
values('70707070-0000-4000-8000-000000000001','40404040-0000-4000-8000-000000000002');
update public.subscription_offerings
set status='inactive'
where subscription_id='70707070-0000-4000-8000-000000000001'
  and course_offering_id='40404040-0000-4000-8000-000000000001';
delete from public.subscription_offerings
where subscription_id='70707070-0000-4000-8000-000000000001'
  and course_offering_id='40404040-0000-4000-8000-000000000001';
\set ON_ERROR_STOP on
select test.assert_count('curator cannot delete course offering','select count(*) from public.course_offerings where id=''40404040-0000-4000-8000-000000000001''',1);
reset role;
select test.assert_count('curator cannot create commercial subscription mapping','select count(*) from public.subscription_offerings where subscription_id=''70707070-0000-4000-8000-000000000001'' and course_offering_id=''40404040-0000-4000-8000-000000000002''',0);
select test.assert_count('curator cannot manage commercial subscription mapping','select count(*) from public.subscription_offerings where subscription_id=''70707070-0000-4000-8000-000000000001'' and course_offering_id=''40404040-0000-4000-8000-000000000001'' and status=''active''',1);

set role authenticated;
select test.set_user('10101010-0000-4000-8000-000000000005');
select test.assert_count('unrelated curator cannot read closed course offering','select count(*) from public.course_offerings where id=''40404040-0000-4000-8000-000000000001''',0);
select test.assert_count('unrelated curator cannot read subscription offering','select count(*) from public.subscription_offerings where subscription_id=''70707070-0000-4000-8000-000000000001''',0);

select test.set_user('10101010-0000-4000-8000-000000000006');
update public.course_offerings set enrollment_status='archived'
where id='40404040-0000-4000-8000-000000000001';
select test.assert_count('admin mutates course offering','select count(*) from public.course_offerings where id=''40404040-0000-4000-8000-000000000001'' and enrollment_status=''archived''',1);
update public.course_offerings set enrollment_status='closed'
where id='40404040-0000-4000-8000-000000000001';
insert into public.subscription_offerings(subscription_id,course_offering_id)
values('70707070-0000-4000-8000-000000000001','40404040-0000-4000-8000-000000000002');
select test.assert_count('admin creates commercial subscription mapping','select count(*) from public.subscription_offerings where subscription_id=''70707070-0000-4000-8000-000000000001'' and course_offering_id=''40404040-0000-4000-8000-000000000002'' and status=''active''',1);
update public.subscription_offerings
set status='inactive'
where subscription_id='70707070-0000-4000-8000-000000000001'
  and course_offering_id='40404040-0000-4000-8000-000000000002';
select test.assert_count('admin updates commercial subscription mapping','select count(*) from public.subscription_offerings where subscription_id=''70707070-0000-4000-8000-000000000001'' and course_offering_id=''40404040-0000-4000-8000-000000000002'' and status=''inactive''',1);
delete from public.subscription_offerings
where subscription_id='70707070-0000-4000-8000-000000000001'
  and course_offering_id='40404040-0000-4000-8000-000000000002';
select test.assert_count('admin deletes commercial subscription mapping','select count(*) from public.subscription_offerings where subscription_id=''70707070-0000-4000-8000-000000000001'' and course_offering_id=''40404040-0000-4000-8000-000000000002''',0);
reset role;

insert into public.subscriptions(id,student_id,plan_id,status,price_minor)
values('70707070-0000-4000-8000-000000000002','10101010-0000-4000-8000-000000000001','60606060-0000-4000-8000-000000000001','pending',10000);
insert into public.subscription_subjects(subscription_id,subject_id)
values('70707070-0000-4000-8000-000000000002','20202020-0000-4000-8000-000000000001');
insert into public.subscription_offerings(subscription_id,course_offering_id)
values('70707070-0000-4000-8000-000000000002','40404040-0000-4000-8000-000000000001');

set role authenticated;
select test.set_user('10101010-0000-4000-8000-000000000001');
select * from public.prepare_subscription_payment('70707070-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001');
select public.attach_yookassa_payment(
  (select id from public.payments where subscription_id='70707070-0000-4000-8000-000000000002'),
  'course_offering_provider_001',
  '{"status":"pending"}'::jsonb
);
reset role;

set role service_role;
select public.finalize_yookassa_payment('course_offering_provider_001','succeeded',10000,'RUB','{"status":"succeeded"}'::jsonb);
reset role;
select test.assert_count('webhook activation uses offering dates','select count(*) from public.subscriptions s join public.course_offerings co on co.id=''40404040-0000-4000-8000-000000000001'' where s.id=''70707070-0000-4000-8000-000000000002'' and s.status=''active'' and s.source=''yookassa'' and s.starts_at=co.starts_at and s.ends_at=co.ends_at',1);

insert into public.subscriptions(id,student_id,plan_id,status,price_minor)
values('70707070-0000-4000-8000-000000000003','10101010-0000-4000-8000-000000000001','60606060-0000-4000-8000-000000000001','pending',10000);
insert into public.subscription_subjects(subscription_id,subject_id)
values('70707070-0000-4000-8000-000000000003','20202020-0000-4000-8000-000000000001');
insert into public.subscriptions(id,student_id,plan_id,status,price_minor)
values('70707070-0000-4000-8000-000000000004','10101010-0000-4000-8000-000000000001','60606060-0000-4000-8000-000000000001','pending',10000);

set role authenticated;
select test.set_user('10101010-0000-4000-8000-000000000001');
\set ON_ERROR_STOP off
select * from public.prepare_subscription_payment('70707070-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004');
\set ON_ERROR_STOP on
select test.assert_count('unscoped subscription remains rejected','select count(*) from public.payments where subscription_id=''70707070-0000-4000-8000-000000000004''',0);
select * from public.prepare_subscription_payment('70707070-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003');
select test.assert_count('valid subject-only legacy subscription remains payable','select count(*) from public.payments where subscription_id=''70707070-0000-4000-8000-000000000003'' and amount_minor=10000 and status=''pending''',1);

select 'CourseOffering RLS integration suite passed';
