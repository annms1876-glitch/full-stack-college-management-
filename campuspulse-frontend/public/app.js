const {api,supabase}=await import("/api.js");
const screens=["feed","login","faculty","profile","study","clubs"], path=location.pathname.replace(/\/$/,"")||"/", dark=path.startsWith("/dark/"), prefix=dark?"/dark":"";
const route=s=>`${prefix}/${s==="faculty"?"directory/faculty":s}`;
if(dark)localStorage.setItem("campuspulse-theme","dark");else if(path!=="/")localStorage.setItem("campuspulse-theme","light");
function toast(msg){let el=document.getElementById("campuspulse-toast");if(!el){el=document.createElement("div");el.id="campuspulse-toast";el.setAttribute("role","status");el.setAttribute("aria-live","polite");Object.assign(el.style,{position:"fixed",left:"50%",bottom:"88px",zIndex:10000,transform:"translateX(-50%)",maxWidth:"min(90vw,420px)",padding:"11px 16px",borderRadius:"999px",background:"#345f47",color:"#fffefa",font:'500 13px/1.35 "DM Sans",sans-serif',boxShadow:"0 8px 28px #0003"});document.body.append(el)}el.textContent=msg;clearTimeout(toast.t);toast.t=setTimeout(()=>el.remove(),3200)}
function statusBox(message, bad=false){let el=document.getElementById("backend-status");if(!el){el=document.createElement("p");el.id="backend-status";el.setAttribute("role","status");el.setAttribute("aria-live","polite");el.style.cssText='margin:12px 0;padding:8px 12px;border-radius:8px;font:14px/1.4 "DM Sans",sans-serif;background:#f7f6f1;color:#17241e';document.querySelector("main")?.prepend(el)}el.textContent=message;el.dataset.error=String(bad)}
function navTarget(a){const icon=a.querySelector(".material-symbols-outlined,.material-symbols-rounded,.material-icons"),name=(icon?.textContent||"").trim().toLowerCase(),label=(a.textContent||"").trim().toLowerCase(),href=(a.getAttribute("href")||"").toLowerCase();if(name==="home"||href.includes("home-feed")||href==="#home")return"feed";if(name==="groups"||href==="#clubs"||label.includes("clubs"))return"clubs";if(name==="school"||href==="#study"||label.includes("study"))return"study";if(name==="search"||href.includes("search/")||href==="#search"||label==="search")return"faculty";if(label.includes("profile")||href.includes("student-profile")||href==="#profile")return"profile";return null}
document.querySelectorAll("a").forEach(a=>{const r=navTarget(a);if(r)a.href=route(r)});
document.addEventListener("keydown",e=>{if(e.altKey&&e.shiftKey&&e.key.toLowerCase()==="d"){e.preventDefault();const s=screens.find(x=>path.endsWith("/"+x))||"feed",t=dark?"light":"dark",target=s==="faculty"?"directory/faculty":s;localStorage.setItem("campuspulse-theme",t);location.assign(`${t==="dark"?"/dark":""}/${target}`)}});
function withBusy(button, fn){button.addEventListener("click",async()=>{if(button.disabled)return;const old=button.textContent;button.disabled=true;button.setAttribute("aria-busy","true");try{await fn()}catch(e){toast(e?.message||"Request failed. Please try again.")}finally{button.disabled=false;button.removeAttribute("aria-busy");if(button.dataset.restoreText)button.textContent=old}})}
// Login and sign-up are handled only by login-app.js, which checks the trusted profile role before routing.
api.onAuth((_event,session)=>{document.documentElement.dataset.authenticated=String(Boolean(session));document.querySelectorAll("[data-auth-required]").forEach(el=>el.hidden=!session)});
const signout=document.querySelector('[data-action="signout"],#btn-signout');if(signout)withBusy(signout,async()=>{const {error}=await api.signOut();if(error)throw error;location.assign(route("login"))});
// Session-gated route behavior; public browse screens remain accessible.
if(["/profile","/study"].some(x=>path.endsWith(x))){Promise.resolve().then(()=>api.session()).then(({data,error})=>{if(error)throw error;if(!data.session){statusBox("Sign in to access your account-specific profile and study records.");return}if(path.endsWith("/profile"))api.profile(data.session.user.id).then(p=>{const name=document.querySelector("h1");if(name&&p.full_name)name.textContent=p.full_name;statusBox("Profile loaded.")}).catch(e=>statusBox(`Profile unavailable: ${e.message}`,true))}).catch(e=>statusBox(`Session check failed: ${e.message}`,true))}
// Existing static sample feed cards have no database post IDs, so avoid pretending that a local toggle persisted.
document.querySelectorAll(".like-btn,.save-btn").forEach(b=>{b.addEventListener("click",async e=>{e.preventDefault();const id=b.closest("[data-post-id]")?.dataset.postId;if(!id){toast("Sign in to CampusPulse to like, save and comment on posts.");return}const enabled=b.getAttribute("aria-pressed")!=="true",like=b.classList.contains("like-btn"),icon=b.querySelector(".material-symbols-outlined,.material-symbols-rounded,.material-icons");try{const result=await (like?api.like(id,enabled):api.save(id,enabled));if(result?.error)throw result.error;b.setAttribute("aria-pressed",String(enabled));if(like){if(icon)icon.textContent=enabled?"favorite":"favorite_border";const count=b.querySelector(".like-count"),n=Number(count?.textContent??b.dataset.count);if(Number.isFinite(n)){const next=n+(enabled?1:-1);if(count)count.textContent=String(next);b.dataset.count=String(next)}b.setAttribute("aria-label",enabled?"Unlike post":"Like post")}else{if(icon)icon.textContent=enabled?"bookmark":"bookmark_border";const prior=b.getAttribute("aria-label")||"Save post",subject=prior.replace(/^(Saved|Save)\s*/i,"");b.setAttribute("aria-label",`${enabled?"Saved":"Save"} ${subject}`)}toast(enabled?(like?"Liked successfully.":"Saved successfully."):(like?"Like removed.":"Removed successfully."))}catch(err){toast(`Not saved: ${err?.message||"Request failed."}`)}})});
// Expose supported faculty directory query only. Current faculty screen is search/directory, not a dashboard.
if(path.endsWith("/faculty")){statusBox("Loading faculty directory…");api.faculty().then(rows=>{statusBox(rows.length?`${rows.length} faculty profiles loaded. Search controls remain local to this directory.` : "No faculty profiles found.");const box=document.querySelector("main");if(box&&rows.length){const list=document.createElement("ul");list.setAttribute("aria-label","Faculty directory results");rows.forEach(p=>{const li=document.createElement("li");li.textContent=[p.full_name,p.bio].filter(Boolean).join(" — ");list.append(li)});box.append(list)}}).catch(e=>statusBox(`Faculty directory could not load: ${e.message}`,true))}
if(path.endsWith("/clubs")){
  statusBox("Loading clubs…");
  const joinButtons=[...document.querySelectorAll(".join-club-btn")];
  const unavailable=()=>toast("Unavailable: no matching backend club is ready; membership was not saved.");
  joinButtons.forEach(b=>b.addEventListener("click",unavailable));
  api.clubs().then(async rows=>{
    statusBox(rows.length?`${rows.length} clubs loaded from CampusPulse.`:"No clubs available yet.");
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError)throw userError;
    const byName=new Map(rows.map(x=>[x.name.toLowerCase(),x]));
    joinButtons.forEach(b=>{
      const card=b.closest("article,section,div"),name=card?.querySelector("h2,h3")?.textContent?.trim(),club=byName.get((name||"").toLowerCase());
      if(!club)return;
      const replacement=b.cloneNode(true),initiallyMember=Boolean(user&&(club.club_members||[]).some(m=>m.user_id===user.id));
      replacement.textContent=initiallyMember?"Leave Club":"Join Club";
      b.replaceWith(replacement);
      withBusy(replacement,async()=>{
        const {data:{user:currentUser},error}=await supabase.auth.getUser();
        if(error)throw error;
        if(!currentUser)throw Error("Sign in to join clubs.");
        const members=club.club_members||[],member=members.some(m=>m.user_id===currentUser.id),joining=!member;
        const result=await api.joinClub(club.id,joining);
        if(result?.error)throw result.error;
        club.club_members=joining?[...members,{user_id:currentUser.id,role:"member"}]:members.filter(m=>m.user_id!==currentUser.id);
        replacement.textContent=joining?"Leave Club":"Join Club";
        toast(joining?"Membership saved.":"Membership removed.");
      });
    });
  }).catch(e=>statusBox(`Clubs unavailable: ${e.message}`,true));
}
// ---------------------------------------------------------------------------
// Live coursework surfaces. Rows come from Supabase under the student's JWT, so
// every notice, course, assignment and submission below carries a real UUID and
// is filtered by row level security.
// ---------------------------------------------------------------------------
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const formatDate=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?"—":d.toLocaleDateString(undefined,{day:"2-digit",month:"short",year:"numeric"})};
const formatDateTime=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?"—":d.toLocaleString(undefined,{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})};
function livePanel(title,subtitle,inner){const section=document.createElement("section");section.className="campuspulse-live";section.id=title.toLowerCase().replace(/[^a-z0-9]+/g,"-");section.setAttribute("aria-label",title);Object.assign(section.style,{margin:"16px auto",maxWidth:"960px",padding:"16px 18px",borderRadius:"14px",border:"1px solid color-mix(in srgb,currentColor 22%,transparent)",font:'400 14px/1.55 "DM Sans",sans-serif'});section.innerHTML=`<h2 style="margin:0 0 2px;font:700 15px/1.3 Manrope,sans-serif;letter-spacing:.01em">${escapeHtml(title)}</h2><p style="margin:0 0 12px;font-size:12.5px;opacity:.72">${escapeHtml(subtitle)}</p>${inner}`;document.querySelector("main")?.prepend(section);return section}
const pillStyle=tone=>`display:inline-block;padding:2px 9px;border-radius:999px;font-size:11.5px;font-weight:600;border:1px solid color-mix(in srgb,currentColor 24%,transparent);${tone==="ok"?"background:#345f47;color:#fffefa;border-color:#345f47":tone==="warn"?"background:#fff4dd;color:#7a4a00;border-color:#e8c88a":"opacity:.8"}`;
const buttonStyle="display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:999px;border:1px solid color-mix(in srgb,currentColor 28%,transparent);font:600 12.5px/1.2 \"DM Sans\",sans-serif;cursor:pointer";
const primaryButtonStyle="display:inline-flex;align-items:center;gap:6px;padding:8px 15px;border-radius:999px;border:1px solid #345f47;background:#345f47;color:#fffefa;font:600 12.5px/1.2 \"DM Sans\",sans-serif;cursor:pointer";
const emptyRow=message=>`<p style="margin:4px 0;font-size:13px;opacity:.75">${escapeHtml(message)}</p>`;
async function whenSignedIn(fn){try{const {data,error}=await api.session();if(error)throw error;if(!data.session?.user){statusBox("Sign in to load your live notices, courses and assignments.");return}await fn(data.session.user)}catch(e){statusBox(e?.message||"Request failed.",true)}}
if(path.endsWith("/feed")){
  whenSignedIn(async()=>{
    const notices=await api.notices(6);
    const rows=(notices||[]).map(n=>`<article data-notice-id="${escapeHtml(n.id)}" style="padding:11px 0;border-top:1px solid color-mix(in srgb,currentColor 14%,transparent)"><div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap"><strong style="font:600 13.5px/1.4 Manrope,sans-serif">${escapeHtml(n.title)}</strong><span style="font-size:11.5px;opacity:.65">${escapeHtml(n.author?.full_name||"CampusPulse")} · ${escapeHtml(formatDate(n.published_at))} · ${escapeHtml(n.audience)}</span></div><p style="margin:4px 0 0;font-size:13px;white-space:pre-line">${escapeHtml(n.body).slice(0,600)}</p></article>`).join("");
    livePanel("Live college notices",`${(notices||[]).length} notice${(notices||[]).length===1?"":"s"} from public.notices · scoped by your college and role`,rows||emptyRow("No notices have been published for your audience yet."));
  });
}
if(path.endsWith("/study")){
  whenSignedIn(async(user)=>{
    const [courses,assignments,submissions]=await Promise.all([api.myCourses(),api.assignments(),api.mySubmissions()]);
    const courseLabel=new Map((courses||[]).map(row=>[row.course?.id,row.course]));
    const byAssignment=new Map((submissions||[]).map(s=>[s.assignment_id,s]));
    const courseRows=(courses||[]).map(row=>`<li style="display:flex;gap:8px;flex-wrap:wrap;align-items:baseline;padding:5px 0"><span style="font:600 12px/1.2 ui-monospace,monospace">${escapeHtml(row.course?.code)}</span><span style="font-size:13px">${escapeHtml(row.course?.title)}</span><span style="font-size:11.5px;opacity:.65">${escapeHtml(row.course?.term||"")} · ${escapeHtml(row.course?.faculty?.full_name||"Faculty")}</span></li>`).join("");
    const assignmentRows=(assignments||[]).map(a=>{
      const submission=byAssignment.get(a.id),overdue=!submission&&new Date(a.due_at).getTime()<Date.now();
      const status=submission?(submission.status==="graded"?`Graded · ${submission.grade??"—"}/${a.max_points}`:"Submitted"):overdue?"Overdue":"Open";
      const tone=submission?"ok":overdue?"warn":"";
      const action=submission
        ? `<button type="button" style="${buttonStyle}" data-download-submission="${escapeHtml(submission.id)}" data-file-name="${escapeHtml(submission.file_name)}">Download ${escapeHtml(submission.file_name)}</button>`
        : `<form class="assignment-upload" data-assignment-id="${escapeHtml(a.id)}" data-course-id="${escapeHtml(a.course_id)}" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input type="file" name="file" required aria-label="Choose a file for ${escapeHtml(a.title)}" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip" style="font-size:12px;max-width:230px" /><button type="submit" style="${primaryButtonStyle}">Upload &amp; submit</button></form>`;
      return `<article data-assignment-id="${escapeHtml(a.id)}" style="padding:12px 0;border-top:1px solid color-mix(in srgb,currentColor 14%,transparent)"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline"><div><span style="font:600 12px/1.2 ui-monospace,monospace">${escapeHtml(a.course?.code||courseLabel.get(a.course_id)?.code)}</span> <strong style="font:600 13.5px/1.4 Manrope,sans-serif">${escapeHtml(a.title)}</strong></div><span style="${pillStyle(tone)}">${escapeHtml(status)}</span></div><p style="margin:4px 0 8px;font-size:12.5px;opacity:.78">Due ${escapeHtml(formatDateTime(a.due_at))} · ${escapeHtml(String(a.max_points))} points${a.allow_late?" · late submissions allowed":""}${submission?` · submitted ${escapeHtml(formatDateTime(submission.submitted_at))}${submission.feedback?` · feedback: ${escapeHtml(submission.feedback)}`:""}`:""}</p><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${action}</div></article>`;
    }).join("");
    const panel=livePanel(
      "Your enrolled courses & assignments",
      `${(courses||[]).length} active enrollment${(courses||[]).length===1?"":"s"} · ${(assignments||[]).length} assignment${(assignments||[]).length===1?"":"s"} · files are private and capped at 25 MiB`,
      `<div><h3 style="margin:0 0 2px;font:700 12.5px/1.3 Manrope,sans-serif;text-transform:uppercase;letter-spacing:.06em;opacity:.7">Active courses</h3><ul style="margin:2px 0 10px;padding-left:16px">${courseRows||"<li style='font-size:13px;opacity:.75'>No active enrollments yet.</li>"}</ul></div><div>${assignmentRows||emptyRow("No assignments yet. Your faculty can publish coursework for the courses above.")}</div>${(courses||[]).length?"":"<p style='margin:8px 0 0;font-size:12.5px;opacity:.75'>Self-enrollment is disabled by policy. Ask a college administrator to enroll you, or run the demo seed to create enrollments.</p>"}`,
    );
    panel.querySelectorAll("form.assignment-upload").forEach(form=>form.addEventListener("submit",async event=>{
      event.preventDefault();
      const input=form.querySelector('input[type="file"]'), button=form.querySelector('button[type="submit"]'), file=input?.files?.[0];
      if(!file){toast("Choose a file to upload.");return}
      const assignment=(assignments||[]).find(a=>a.id===form.dataset.assignmentId);
      if(!assignment){toast("This assignment could not be resolved.");return}
      const original=button.textContent;button.disabled=true;button.textContent="Uploading…";
      try{
        const saved=await api.submitAssignment({assignment,courseId:form.dataset.courseId,file});
        toast(`Submitted ${saved.file_name}. Your faculty can now review it.`);
        form.outerHTML=`<span style="${pillStyle("ok")}">Submitted · ${escapeHtml(formatDateTime(saved.submitted_at))}</span>`;
      }catch(error){toast(error?.message||"Upload failed.");button.disabled=false;button.textContent=original}
    }));
    panel.querySelectorAll("[data-download-submission]").forEach(button=>button.addEventListener("click",async()=>{
      const submission=(submissions||[]).find(s=>s.id===button.dataset.downloadSubmission);
      if(!submission){toast("Submission not found.");return}
      button.disabled=true;
      try{await api.openSignedUrl("assignments",submission.file_path)}catch(error){toast(error?.message||"Download link unavailable.")}finally{button.disabled=false}
    }));
  });
}
// Existing filter/tab/share controls remain local presentation behavior; buttons without schema-linked IDs are explicitly non-persistent.
document.querySelectorAll(".feed-filter-chip").forEach(b=>b.addEventListener("click",()=>{const q=b.textContent.trim().toLowerCase(),rules={academics:/academic|exam|semester|attendance|study/i,events:/event|club|cultural/i,placements:/placement|internship|stipend/i};document.querySelectorAll(".feed-post").forEach(p=>p.hidden=Boolean(rules[q]&&!rules[q].test(p.textContent||"")))}));
document.querySelectorAll(".share-btn").forEach(b=>b.addEventListener("click",async()=>{try{if(navigator.share)await navigator.share({title:"CampusPulse post",url:location.href});else await navigator.clipboard.writeText(location.href);toast("Link ready to share.")}catch(e){if(e.name!=="AbortError")toast("Could not share this link.")}}));
window.CampusPulse=Object.freeze({theme:dark?"dark":"light",routes:Object.freeze(Object.fromEntries(screens.map(s=>[s,route(s)]))),api});
// Live social layer: composer, posts, comments, stories and the profile editor.
await import("/social.js");
// Study hub: doubts, votes, solutions and shared study files.
await import("/study.js");
// Clubs and events: live event cards and saved RSVPs.
await import("/clubs.js");
