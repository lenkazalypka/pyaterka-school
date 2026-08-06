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
 ('55555555-5555-4555-8555-555555555555','c1@t','{"intended_role":"student","first_name":"C1"}');

insert into public.teacher_profiles(user_id) values('44444444-4444-4444-8444-444444444444');
insert into public.curator_profiles(user_id) values('55555555-5555-4555-8555-555555555555');
delete from public.user_roles where user_id in ('44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555');
insert into public.user_roles(user_id,role_id) select '44444444-4444-4444-8444-444444444444',id from public.roles where code='teacher';
insert into public.user_roles(user_id,role_id) select '55555555-5555-4555-8555-555555555555',id from public.roles where code='curator';

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

select test.set_user('11111111-1111-4111-8111-111111111111');
select test.assert_uid('11111111-1111-4111-8111-111111111111');
\set ON_ERROR_STOP off
insert into public.user_roles(user_id,role_id)
select '11111111-1111-4111-8111-111111111111',id from public.roles where code='admin';
\set ON_ERROR_STOP on
select test.assert_count('student cannot assign admin','select count(*) from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.user_id=''11111111-1111-4111-8111-111111111111'' and r.code=''admin''',0);

reset role;
select 'RLS integration suite passed';
