import { notFound, redirect } from "next/navigation";
import { ExamForm } from "@/components/onboarding/exam-form";
import { OnboardingFrame } from "@/components/onboarding/frame";
import { GoalsForm } from "@/components/onboarding/goals-form";
import { ParentForm } from "@/components/onboarding/parent-form";
import { PlanForm } from "@/components/onboarding/plan-form";
import { ProfileForm } from "@/components/onboarding/profile-form";
import { ReviewForm } from "@/components/onboarding/review-form";
import { ScheduleForm } from "@/components/onboarding/schedule-form";
import { SubjectsForm } from "@/components/onboarding/subjects-form";
import { isOnboardingSlug, stepNumber, stepPath } from "@/lib/onboarding-config";
import { requireIncompleteOnboarding } from "@/lib/onboarding";
import type { AdmissionGoalDraft, ExamOption, ParentDraft, PlanOption, ProfileDraft, ReviewData, ScheduleDraft, SubjectDraft, SubjectOption } from "@/types/onboarding";

export const dynamic = "force-dynamic";

type Db = Awaited<ReturnType<typeof requireIncompleteOnboarding>>["db"];
const today = () => new Date().toISOString().slice(0, 10);
const cleanTime = (value: string | null | undefined) => value?.slice(0, 5) ?? "";

async function profileData(db: Db, userId: string): Promise<ProfileDraft> {
  const [{ data: profile }, { data: student }] = await Promise.all([
    db.from("profiles").select("first_name,last_name,phone,city,timezone,preferred_contact_method").eq("id", userId).single(),
    db.from("student_profiles").select("birth_date,grade,school").eq("user_id", userId).single(),
  ]);
  return { firstName:profile?.first_name??"", lastName:profile?.last_name??"", birthDate:student?.birth_date??"", phone:profile?.phone??"", city:profile?.city??"", timezone:profile?.timezone??"Europe/Moscow", grade:student?.grade??11, school:student?.school??"", contactMethod:(profile?.preferred_contact_method??"email") as ProfileDraft["contactMethod"] };
}

async function planOptions(db: Db): Promise<PlanOption[]> {
  const { data } = await db.from("plans").select("id,name,code,base_price_minor,currency,plan_features(feature_code,enabled,limit_value),plan_subject_limits(max_subjects)").eq("active",true).order("base_price_minor");
  return (data??[]).map((plan)=>({ id:plan.id,name:plan.name,code:plan.code,basePriceMinor:plan.base_price_minor,currency:plan.currency,maxSubjects:(plan.plan_subject_limits as unknown as {max_subjects:number}|null)?.max_subjects??1,features:((plan.plan_features??[]) as {feature_code:string;enabled:boolean;limit_value:number|null}[]).map((feature)=>({code:feature.feature_code,enabled:feature.enabled,limit:feature.limit_value})) }));
}

async function subjectsData(db: Db, userId: string, examTypeId: string) {
  const [{data:subjects},{data:rules},{data:selected}] = await Promise.all([
    db.from("subjects").select("id,name,code").eq("exam_type_id",examTypeId).eq("active",true).is("deleted_at",null).order("name"),
    db.from("exam_scoring_rules").select("subject_id,max_score,unit,label").eq("exam_type_id",examTypeId),
    db.from("student_subjects").select("subject_id,current_grade,self_reported_last_mock_score,confidence,target_score,weak_topics,student_comment").eq("student_id",userId).eq("status","active"),
  ]);
  const fallback=rules?.find((rule)=>rule.subject_id===null);
  const options:SubjectOption[]=(subjects??[]).map((subject)=>{const rule=rules?.find((item)=>item.subject_id===subject.id)??fallback;return{id:subject.id,name:subject.name,code:subject.code,maxScore:rule?.max_score??100,scoreUnit:(rule?.unit??"test_score") as SubjectOption["scoreUnit"],scoreLabel:rule?.label??"Баллы"};});
  const drafts:SubjectDraft[]=(selected??[]).map((item)=>({subjectId:item.subject_id,currentGrade:item.current_grade??4,lastMockScore:item.self_reported_last_mock_score,confidence:item.confidence??5,targetScore:item.target_score,weakTopics:item.weak_topics??[],comment:item.student_comment??""}));
  return {options,drafts};
}

async function goalsData(db: Db, userId: string): Promise<AdmissionGoalDraft[]> {
  const {data}=await db.from("admission_goals").select("institution_type,institution_name,direction_name,city,funding_type,priority,minimum_passing_score,desired_score,needs_admission_help,needs_career_guidance").eq("student_id",userId).eq("status","active").order("priority");
  return (data??[]).map((goal)=>({institutionType:goal.institution_type as AdmissionGoalDraft["institutionType"],institutionName:goal.institution_name,directionName:goal.direction_name??"",city:goal.city??"",fundingType:(goal.funding_type??"budget") as AdmissionGoalDraft["fundingType"],priority:goal.priority??1,minimumPassingScore:goal.minimum_passing_score,desiredScore:goal.desired_score??0,needsAdmissionHelp:goal.needs_admission_help,needsCareerGuidance:goal.needs_career_guidance}));
}

async function scheduleData(db: Db, userId: string, timezone: string): Promise<ScheduleDraft> {
  const [{data:preferences},{data:slots}]=await Promise.all([
    db.from("student_study_preferences").select("weekly_hours,preferred_format,strict_control,daily_reminders,other_courses,current_weekly_load,desired_start_date,timezone").eq("student_id",userId).maybeSingle(),
    db.from("preferred_schedule_slots").select("weekday,starts_at,ends_at").eq("student_id",userId).order("weekday"),
  ]);
  return {weeklyHours:preferences?.weekly_hours??6,preferredFormat:(preferences?.preferred_format??"group") as ScheduleDraft["preferredFormat"],strictControl:preferences?.strict_control??false,dailyReminders:preferences?.daily_reminders??true,otherCourses:preferences?.other_courses??"",currentWeeklyLoad:preferences?.current_weekly_load??0,desiredStartDate:preferences?.desired_start_date??today(),timezone:preferences?.timezone??timezone,slots:(slots??[]).map((slot)=>({weekday:slot.weekday,startsAt:cleanTime(slot.starts_at),endsAt:cleanTime(slot.ends_at)}))};
}

async function parentData(db: Db, userId: string): Promise<ParentDraft> {
  const {data}=await db.from("onboarding_parent_drafts").select("invite_requested,parent_name,email,phone,relation").eq("student_id",userId).maybeSingle();
  return {inviteRequested:data?.invite_requested??false,parentName:data?.parent_name??"",email:data?.email??"",phone:data?.phone??"",relation:data?.relation??""};
}

export default async function OnboardingStepPage({params}:{params:Promise<{step:string}>}) {
  const {step:slug}=await params;
  if(!isOnboardingSlug(slug)) notFound();
  const step=stepNumber(slug);
  const {db,user,onboarding}=await requireIncompleteOnboarding();
  if(step>(onboarding?.current_step??1)) redirect(stepPath(onboarding?.current_step??1));
  let content:React.ReactNode;
  if(slug==="profile"){
    const initial=await profileData(db,user.id); content=<ProfileForm initial={initial} autoTimezone={!initial.lastName}/>;
  } else if(slug==="exam"){
    const [{data:exams},{data:student}]=await Promise.all([db.from("exam_types").select("id,code,name").eq("active",true).order("name"),db.from("student_profiles").select("grade").eq("user_id",user.id).single()]);
    content=<ExamForm exams={(exams??[]) as ExamOption[]} selectedId={onboarding?.exam_type_id??""} grade={student?.grade??11}/>;
  } else if(slug==="subjects"){
    if(!onboarding?.exam_type_id) redirect("/onboarding/exam"); const data=await subjectsData(db,user.id,onboarding.exam_type_id); content=<SubjectsForm subjects={data.options} initial={data.drafts}/>;
  } else if(slug==="goals"){
    content=<GoalsForm initial={await goalsData(db,user.id)}/>;
  } else if(slug==="schedule"){
    const {data:profile}=await db.from("profiles").select("timezone").eq("id",user.id).single(); content=<ScheduleForm initial={await scheduleData(db,user.id,profile?.timezone??"Europe/Moscow")}/>;
  } else if(slug==="parent"){
    content=<ParentForm initial={await parentData(db,user.id)}/>;
  } else if(slug==="plan"){
    const [{count},plans]=await Promise.all([db.from("student_subjects").select("id",{count:"exact",head:true}).eq("student_id",user.id).eq("status","active"),planOptions(db)]); content=<PlanForm plans={plans} selectedId={onboarding?.selected_plan_id??""} subjectCount={count??0}/>;
  } else {
    if(!onboarding?.exam_type_id||!onboarding.selected_plan_id) redirect("/onboarding/plan");
    const [profile,{data:exam},subjectBundle,goals,schedule,parent,plans]=await Promise.all([profileData(db,user.id),db.from("exam_types").select("name").eq("id",onboarding.exam_type_id).single(),subjectsData(db,user.id,onboarding.exam_type_id),goalsData(db,user.id),scheduleData(db,user.id,(await profileData(db,user.id)).timezone),parentData(db,user.id),planOptions(db)]);
    const optionMap=new Map(subjectBundle.options.map((subject)=>[subject.id,subject])); const plan=plans.find((item)=>item.id===onboarding.selected_plan_id); if(!plan) redirect("/onboarding/plan");
    const review:ReviewData={profile,exam:exam?.name??"",subjects:subjectBundle.drafts.map((draft)=>({...draft,name:optionMap.get(draft.subjectId)?.name??"Предмет",scoreLabel:optionMap.get(draft.subjectId)?.scoreLabel??"Баллы"})),goals,schedule,parent,plan};
    content=<ReviewForm data={review} idempotencyKey={crypto.randomUUID()}/>;
  }
  return <OnboardingFrame step={step}><h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em] sm:text-4xl">{({profile:"Расскажите о себе",exam:"К какому экзамену готовимся?",subjects:"Выберите предметы",goals:"Куда хотите поступить?",schedule:"Как вам удобно заниматься?",parent:"Подключить родителя?",plan:"Выберите тариф",review:"Проверьте анкету"} as const)[slug]}</h1>{content}</OnboardingFrame>;
}

