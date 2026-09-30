import { useState, useMemo } from "react";

import signage from "./assets/signage.svg"; // placeholder — swap for the real signage.jpg
import crest from "./assets/crest.png";
import imgGala from "./assets/station-gala.jpg";
import imgBreakfast from "./assets/station-breakfast.jpg";
import imgTerrace from "./assets/station-terrace.jpg";
import imgLevantine from "./assets/station-levantine.jpg";

/* ------------------------------------------------------------------ *
 * MG Connect — Marsa Grand internal system
 *
 * A leadership simulation. The participant signs in as General Manager
 * and works a single day: sign the festival operating plan, discover a
 * commitment made without them, redeploy the F&B team, then teach a
 * colleague to check guests in. Each round ends in a live call with a
 * co-trainer.
 *
 * Everything here is fictional and the figures are engineered so the
 * arithmetic resolves cleanly in a workshop.
 * ------------------------------------------------------------------ */

const ZOOM =
  "https://us02web.zoom.us/j/87272244060?pwd=oZXLqY9Njgzs80i4JAfy9mY8nb5sgf.1";

const TABS = [
  { id: "today", label: "Today" },
  { id: "approvals", label: "Approvals" },
  { id: "rooms", label: "Rooms" },
  { id: "fb", label: "F&B Deployment" },
  { id: "sop", label: "Check-in" },
];

const STATIONS = [
  { id: "gala", name: "Opening Night Gala", when: "Night 1 only", rev: 44200, img: imgGala },
  { id: "bf", name: "Press Breakfast", when: "Nights 2–8 · 07:00", rev: 62000, img: imgBreakfast },
  { id: "tr", name: "Marina Terrace", when: "24 hours · all 8 nights", rev: 128000, img: imgTerrace },
  { id: "lv", name: "Levantine & Beach Grill", when: "All 8 nights", rev: 105800, img: imgLevantine },
];

/* Strength is simply appraisal + festivals worked. Tier A is 7 or above.
   The submitted plan puts ~70% of strength on 13% of the revenue.
   The model answer — everyone back to their own outlet — brings it to ~21%. */
const PEOPLE = [
  { n: "R. Selim", r: "Assistant F&B Manager", a: 4.5, f: 3, at: "gala" },
  { n: "K. Abdel-Aziz", r: "Levantine Manager", a: 4.4, f: 5, at: "gala" },
  { n: "D. Fahmy", r: "Terrace Supervisor", a: 4.3, f: 3, at: "gala" },
  { n: "T. Mansour", r: "Banquet Supervisor", a: 3.4, f: 4, at: "tr" },
  { n: "N. Tawfik", r: "Hostess", a: 3.2, f: 0, at: "bf" },
];

/* ok:false means housekeeping has not released the room. 1207 is the
   planted failure — checking into it is refused. */
const ROOMS = [
  { no: "1104", t: "Sea view king", rate: 255, ok: true },
  { no: "1207", t: "Sea view king", rate: 255, ok: false },
  { no: "1312", t: "Marina suite", rate: 255, ok: true },
  { no: "0812", t: "Garden king", rate: 395, ok: true },
  { no: "0915", t: "Garden twin", rate: 395, ok: true },
];

const DIVISIONS = [
  {
    i: "NS", n: "N. Sabry", r: "Rooms Division Director", d: 5, tot: 96,
    k: [
      ["M. Serry", "Front Office Manager · 12"],
      ["F. Zaki", "Executive Housekeeper · 54"],
      ["D. Aziz", "Reservations Manager · 4"],
      ["S. Rashed", "Duty Manager"],
      ["H. Abdel-Salam", "Night Shift Leader"],
    ],
  },
  {
    i: "TN", n: "T. Nabil", r: "Food & Beverage Manager", d: 6, tot: 48,
    k: [
      ["R. Selim", "Assistant F&B Manager"],
      ["T. Mansour", "Banquet Supervisor"],
      ["K. Abdel-Aziz", "Levantine Manager"],
      ["D. Fahmy", "Terrace Supervisor"],
      ["A. Helmy", "Chief Steward"],
      ["N. Tawfik", "Hostess"],
    ],
  },
  {
    i: "YF", n: "Y. Farag", r: "Recreation Manager", d: 4, tot: 22,
    k: [
      ["L. Hakim", "Spa Manager · 9"],
      ["M. Gindy", "Beach & Pools"],
      ["N. Sami", "Fitness"],
      ["R. Adel", "Kids Club"],
    ],
  },
];

const SUPPORT = [
  ["M. Anwar", "Director of Finance"],
  ["K. Louka", "Director of Sales & Marketing"],
  ["R. Hamdy", "Human Resources Manager"],
  ["S. Bakr", "Chief Engineer"],
];

const usd = (v) => "$" + v.toLocaleString("en-US");
const strength = (p) => p.a + p.f;
const isTierA = (p) => strength(p) >= 7;

function formatName(raw) {
  const parts = raw.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (!parts.length) return null;
  if (parts.length === 1)
    return { full: parts[0], av: parts[0].slice(0, 2).toUpperCase() };
  const last = parts[parts.length - 1];
  return {
    full: `${parts[0].charAt(0).toUpperCase()}. ${last.charAt(0).toUpperCase()}${last.slice(1)}`,
    av: (parts[0].charAt(0) + last.charAt(0)).toUpperCase(),
  };
}

/* ---------------------------------- icons --------------------------------- */

const IconVideo = (p) => (
  <svg width={p.size || 26} height={p.size || 26} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="6" width="13" height="12" rx="2.5" />
    <path d="M15 10.5l6-3.5v10l-6-3.5z" />
  </svg>
);
const IconAlert = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M12 8.5v5M12 17v.4" />
    <path d="M10.3 3.9L2.5 17.6A2 2 0 0 0 4.2 20.6h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
  </svg>
);
const IconBars = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
  </svg>
);
const IconClock = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M12 7v5l3 2" /><circle cx="12" cy="12" r="9" />
  </svg>
);
const IconTick = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M20 6.5L9.2 17.3 4 12.1" />
  </svg>
);
const IconWarn = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M12 8v5M12 16.5v.5" /><circle cx="12" cy="12" r="9" />
  </svg>
);

/* --------------------------------- modal ---------------------------------- */

function Modal({ data, onClose }) {
  if (!data) return null;
  return (
    <div className={"ov on"} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mdl">
        <div className="mh">
          <div className={"mi " + (data.tone || "gold")}>{data.icon}</div>
          <h3>{data.title}</h3>
          <p>{data.text}</p>
        </div>
        {data.body && <div className="mb">{data.body}</div>}
        <div className="mf">
          {data.actions.map((a, i) => (
            <button key={i} className="btn" onClick={() => { onClose(); a.onClick && a.onClick(); }}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MeetRow({ who, role, zoomId }) {
  return (
    <div className="meetrow">
      <IconVideo />
      <span>
        <b>{who}</b>
        <span>{role}</span>
      </span>
      <a className="join" id={zoomId} href={ZOOM} target="_blank" rel="noreferrer">
        Join call
      </a>
    </div>
  );
}

function ShareNote({ title, children }) {
  return (
    <div className="shr">
      <b>{title}</b>
      {children}
    </div>
  );
}

/* ------------------------------- the system -------------------------------- */

export default function MGConnect() {
  const [gm, setGm] = useState(null);
  const [gateName, setGateName] = useState("");
  const [gateErr, setGateErr] = useState(false);
  const [tab, setTab] = useState("today");
  const [modal, setModal] = useState(null);

  const [fopSigned, setFopSigned] = useState(false);
  const [trailOpen, setTrailOpen] = useState(false);
  const [nourCalled, setNourCalled] = useState(false);
  const [closure, setClosure] = useState("");
  const [crClosed, setCrClosed] = useState(false);
  const [crErr, setCrErr] = useState(false);

  const [people, setPeople] = useState(PEOPLE);
  const [depReviewed, setDepReviewed] = useState(false);
  const [depSigned, setDepSigned] = useState(false);

  const [serryCalled, setSerryCalled] = useState(false);
  const [monitorCalled, setMonitorCalled] = useState(false);
  const [guest, setGuest] = useState("");
  const [rate, setRate] = useState("");
  const [room, setRoom] = useState("");
  const [slip, setSlip] = useState(null);

  const [dropOpen, setDropOpen] = useState(false);
  const [dropTab, setDropTab] = useState("team");

  const locks = {
    today: false,
    approvals: false,
    rooms: !fopSigned,
    fb: !crClosed,
    sop: !depSigned,
  };
  const dots = { approvals: !fopSigned, rooms: fopSigned && tab !== "rooms", fb: crClosed && tab !== "fb", sop: depSigned && tab !== "sop" };

  const go = (id) => { setTab(id); window.scrollTo({ top: 0, behavior: "smooth" }); };

  /* ---- round 2 maths, recalculated on every reassignment ---- */
  const totalRev = STATIONS.reduce((t, s) => t + s.rev, 0);
  const totalStrength = people.reduce((t, p) => t + strength(p), 0);
  const stn = (id) => STATIONS.find((s) => s.id === id);
  const galaStrength = useMemo(
    () => (people.filter((p) => p.at === "gala").reduce((t, p) => t + strength(p), 0) / totalStrength) * 100,
    [people, totalStrength]
  );
  const galaRev = (stn("gala").rev / totalRev) * 100;
  const emptyStations = STATIONS.filter((s) => !people.some((p) => p.at === s.id));
  const emptyRev = (emptyStations.reduce((t, s) => t + s.rev, 0) / totalRev) * 100;
  const verdictTone = galaStrength >= 55 ? "bad" : galaStrength >= 38 ? "warn" : "ok";

  const moved = people.filter((p, i) => p.at !== PEOPLE[i].at);

  /* --------------------------------- gate --------------------------------- */
  const enter = () => {
    const n = formatName(gateName);
    if (!n) { setGateErr(true); return; }
    setGm(n);
  };

  /* -------------------------------- round 1 -------------------------------- */
  const signFop = () => {
    setFopSigned(true);
    setTimeout(() => {
      setModal({
        tone: "red",
        icon: <IconAlert />,
        title: "Procurement has stopped an order",
        text: (
          <>
            The VIP amenity package has been priced for <b>128 rooms</b>. You approved{" "}
            <b>90</b>. The order is on hold and Finance is asking where the other 38 came from.
          </>
        ),
        body: (
          <div className="vs">
            <div className="box"><b className="num">90</b><small>rooms you approved</small></div>
            <div className="arrow">→</div>
            <div className="box bad"><b className="num">128</b><small>rooms already committed</small></div>
          </div>
        ),
        actions: [{ label: "See what was committed", onClick: () => go("rooms") }],
      });
    }, 700);
  };

  const callNour = () => {
    setNourCalled(true);
    setModal({
      tone: "gold",
      icon: <IconVideo />,
      title: "The rooms were confirmed without your approval",
      text: (
        <>
          An approval that was never hers to give has cost the hotel <b>$42,560</b> in rate.
          Nobody came back to you — and releasing inventory or changing a rate is yours alone
          to approve.
          <br /><br />
          She has asked for fifteen minutes. She did not say why.
        </>
      ),
      body: <MeetRow who="N. Sabry" role="Rooms Division Director" zoomId="zoomNour" />,
      actions: [{ label: "I have spoken with her" }],
    });
  };

  const closeCR = () => {
    if (!closure.trim()) { setCrErr(true); return; }
    setCrClosed(true);
    setTimeout(() => {
      setModal({
        tone: "gold",
        icon: <IconBars />,
        title: "T. Nabil has submitted the festival deployment plan",
        text: "Five colleagues across eight nights. The system has flagged how they are spread — review it and redistribute them before you sign.",
        actions: [{ label: "Open the plan", onClick: () => go("fb") }],
      });
    }, 900);
  };

  /* -------------------------------- round 2 -------------------------------- */
  const reassign = (i, stationId) =>
    setPeople((prev) => prev.map((p, j) => (j === i ? { ...p, at: stationId } : p)));

  const reviewDone = () => {
    setDepReviewed(true);
    setModal({
      tone: "gold",
      icon: <IconBars />,
      title: `${Math.round(galaStrength)}% of the team's strength is on ${Math.round(galaRev)}% of the revenue`,
      text: (
        <>
          The gala runs for one night. The other seven carry {usd(totalRev - stn("gala").rev)}.
          {emptyStations.length > 0 && (
            <> And {Math.round(emptyRev)}% of the festival&rsquo;s F&amp;B revenue has no named
              supervisor at all.</>
          )}
          <br /><br />
          Redistribute the five of them so the strongest people cover the longest, largest
          stations — then agree it with T. Nabil before you sign.
        </>
      ),
      body: (
        <>
          <ShareNote title="Share your screen for this call.">
            T. Nabil needs to see the deployment plan while you talk it through with him.
          </ShareNote>
          <MeetRow who="T. Nabil" role="Food & Beverage Manager" zoomId="zoomTaiseer" />
        </>
      ),
      actions: [{ label: "I have spoken with him" }],
    });
  };

  const signDep = () => {
    setDepSigned(true);
    setTimeout(() => {
      setModal({
        tone: "red",
        icon: <IconClock />,
        title: "06:40 · N. Sabry has been admitted to hospital",
        text: (
          <>
            She will not return during the festival.{" "}
            <b>M. Serry takes over the jury and talent arrivals tonight, and he has never
            checked a guest in on this system.</b>{" "}
            148 guests arrive, 41% of them after ten, and you are with the owner from five.
          </>
        ),
        body: (
          <ShareNote title="Show him how, step by step.">
            Do not describe it and do not send him a note. Open the check-in screen, share it,
            and do one arrival in front of him while he watches.
          </ShareNote>
        ),
        actions: [{ label: "Open the check-in screen", onClick: () => go("sop") }],
      });
    }, 1300);
  };

  /* -------------------------------- round 3 -------------------------------- */
  const availableRooms = useMemo(() => {
    const v = parseInt(String(rate).replace(/[^0-9]/g, ""), 10);
    if (!v) return null;
    return ROOMS.filter((r) => r.rate === v);
  }, [rate]);

  const checkIn = () => {
    if (!guest.trim() || !room) {
      setSlip({ error: "Enter a name and choose a room before checking in." });
      return;
    }
    const r = ROOMS.find((x) => x.no === room);
    if (!r.ok) {
      setSlip({ error: `Room ${r.no} has not been released by housekeeping. Choose another room.` });
      return;
    }
    setSlip({ guest: guest.trim(), room: r });
  };

  const callSerry = () => {
    setSerryCalled(true);
    setModal({
      tone: "gold",
      icon: <IconVideo />,
      title: "Call one · show him how",
      text: "He has the desk tonight and has never checked a guest in on this system. Share your screen and do one arrival while he watches, naming each field as you go.",
      body: <MeetRow who="M. Serry" role="Front Office Manager · acting on rooms" zoomId="zoomSerry" />,
      actions: [{ label: "I have shown him" }],
    });
  };

  const callMonitor = () => {
    setMonitorCalled(true);
    setModal({
      tone: "gold",
      icon: <IconVideo />,
      title: "Call two · watch him do it",
      text: "He is ready to try one himself. Keep the screen shared, let him lead, and do not take the keyboard back — even when he pauses.",
      body: <MeetRow who="M. Serry" role="Front Office Manager · acting on rooms" zoomId="zoomSerry2" />,
      actions: [
        {
          label: "He has done it",
          onClick: () =>
            setTimeout(
              () =>
                setModal({
                  tone: "gold",
                  icon: <IconTick />,
                  title: "Thank you — you have completed a day as General Manager",
                  text: "You signed the operating plan, faced rooms your division committed without you, put your people where the week actually needs them, and taught someone to do a job you will not be there to do. The festival opens tonight.",
                  actions: [{ label: "Close" }],
                }),
              500
            ),
        },
      ],
    });
  };

  /* --------------------------------- render -------------------------------- */
  return (
    <>
      <style>{CSS}</style>

      {!gm && (
        <div className="gate">
          <div className="gwrap">
            <div className="gimg"><img src={signage} alt="Marsa Grand" /></div>
            <div className="gform">
              <div className="glogo">
                <img src={crest} alt="" />
                <div><b>MG CONNECT</b><i>MARSA GRAND</i></div>
              </div>
              <h1>Welcome to MG Connect</h1>
              <p className="gp">
                Marsa Grand&rsquo;s internal platform. Everything that needs the General Manager
                arrives here.
              </p>
              <div className="fld">
                <label className="f">Your name</label>
                <input
                  type="text" value={gateName} autoComplete="off"
                  placeholder="Enter your full name"
                  style={gateErr ? { borderColor: "var(--bad)" } : undefined}
                  onChange={(e) => { setGateName(e.target.value); setGateErr(false); }}
                  onKeyDown={(e) => e.key === "Enter" && enter()}
                />
              </div>
              <button className="btn" style={{ width: "100%" }} onClick={enter}>
                Sign in as General Manager
              </button>
              <p className="gfine">A fictional system built for training.</p>
            </div>
          </div>
        </div>
      )}

      {gm && (
        <>
          <div className="top">
            <div className="in">
              <div className="brand">
                <img src={crest} alt="" />
                <div><b>MG CONNECT</b><i>MARSA GRAND</i></div>
              </div>
              <div className="sp" />
              <div className="cd">
                {depSigned ? "FESTIVAL OPENS TONIGHT · 06:40" : "FESTIVAL OPENS IN 6 WEEKS"}
              </div>
              <div className="acct">
                <button className="whob" onClick={(e) => { e.stopPropagation(); setDropOpen((v) => !v); }}>
                  <span className="av">{gm.av}</span>
                  <span className="wt"><b>{gm.full}</b>General Manager</span>
                </button>
                {dropOpen && (
                  <div className="drop" onClick={(e) => e.stopPropagation()}>
                    <div className="dtabs">
                      {["team", "auth", "acct"].map((d) => (
                        <button key={d} className="dtab" aria-selected={dropTab === d}
                                onClick={() => setDropTab(d)}>
                          {d === "team" ? "My team" : d === "auth" ? "My authority" : "Account"}
                        </button>
                      ))}
                    </div>
                    <div className="dbody">
                      {dropTab === "team" && (
                        <>
                          <div className="sub">Reports directly to you</div>
                          <div className="onode">
                            <div className="oh">
                              <span className="oav">HD</span>
                              <span><b>H. Doss</b><span>Executive Assistant Manager</span></span>
                              <span className="cnt"><b className="num">3</b>direct</span>
                            </div>
                            <div className="kids">
                              <div className="kid"><b>Holds</b><span>the three operating divisions</span></div>
                              <div className="kid"><b>Limit</b><span>$10,000 within budget. No rate or inventory authority.</span></div>
                            </div>
                          </div>
                          <div className="sub">Operating divisions</div>
                          {DIVISIONS.map((o) => (
                            <div className="onode" key={o.i}>
                              <div className="oh">
                                <span className="oav">{o.i}</span>
                                <span><b>{o.n}</b><span>{o.r}</span></span>
                                <span className="cnt"><b className="num">{o.d}</b>direct</span>
                              </div>
                              <div className="kids">
                                {o.k.map(([n, r]) => (
                                  <div className="kid" key={n}><b>{n}</b><span>{r}</span></div>
                                ))}
                                <div className="kid" style={{ border: 0 }}>
                                  <b>{o.tot} colleagues</b><span>in the division</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="sub">Support functions</div>
                          {SUPPORT.map(([n, r]) => (
                            <div className="kid" key={n}><b>{n}</b><span>{r}</span></div>
                          ))}
                        </>
                      )}
                      {dropTab === "auth" && (
                        <>
                          <div className="kid"><b>Yours alone</b><span>Inventory · rate · unbudgeted spend · commitments to partners</span></div>
                          <div className="kid"><b>H. Doss</b><span>To $10,000 within budget. Nothing on your behalf.</span></div>
                          <div className="kid"><b>Heads of Department</b><span>Rosters, recovery to $500, purchases to $2,000</span></div>
                        </>
                      )}
                      {dropTab === "acct" && (
                        <>
                          <div className="kid"><b>{gm.full}</b><span>General Manager · 4 months in post</span></div>
                          <div className="kid"><b>Property</b><span>Marsa Grand · 240 keys · 310 colleagues</span></div>
                          <div className="kid"><b>Reports to</b><span>Regional Operations Director</span></div>
                          <div className="kid"><b>Signed in</b><span>Executive Office · 07:52</span></div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="nav">
            <div className="in" role="tablist">
              {TABS.map((t) => (
                <button key={t.id} className="tab" role="tab"
                        aria-selected={tab === t.id}
                        data-lock={locks[t.id] ? "1" : "0"}
                        onClick={() => !locks[t.id] && go(t.id)}>
                  {t.label}
                  {dots[t.id] && <span className="dot" />}
                </button>
              ))}
            </div>
          </div>

          <main onClick={() => setDropOpen(false)}>
            {/* ------------------------------ TODAY ------------------------------ */}
            {tab === "today" && (
              <section className="page on">
                <div className="greet">
                  <div>
                    <p className="lbl" style={{ margin: "0 0 8px" }}>Thursday · 07:52</p>
                    <h2 style={{ margin: 0 }}>Good morning, {gm.full}</h2>
                  </div>
                  <p className="sm" style={{ margin: 0 }}>Six weeks to the festival</p>
                </div>

                <p className="sect">The hotel today</p>
                <div className="ops">
                  {[["163", "in house"], ["48", "arrivals today"], ["39", "departures"],
                    ["76%", "occupancy tonight"], ["$182", "average rate tonight"],
                    ["214", "rooms sellable in October"]].map(([v, l]) => (
                    <div className="op" key={l}><b className="num">{v}</b><small>{l}</small></div>
                  ))}
                </div>

                <div className="cols2">
                  <div>
                    <p className="sect">Your to-do list</p>
                    <div className="card" style={{ margin: 0 }}>
                      <ul className="todo">
                        <li className="act" onClick={() => go("approvals")}>
                          <span className="tk">!</span>
                          <span className="tt">
                            <b>Sign the Festival Operating Plan</b>
                            <span>Raised by N. Sabry · nothing is committed to the organisers until you sign</span>
                          </span>
                          <span className="when">14 days waiting</span>
                        </li>
                        <li className="done">
                          <span className="tk">✓</span>
                          <span className="tt"><b>Approve the October duty roster</b></span>
                          <span className="when">Yesterday</span>
                        </li>
                        <li>
                          <span className="tk" />
                          <span className="tt"><b>Owner&rsquo;s site visit brief</b><span>Notes for the 21 October arrival</span></span>
                          <span className="when">Friday</span>
                        </li>
                        <li>
                          <span className="tk" />
                          <span className="tt"><b>Quarterly review with R. Hamdy</b><span>Human Resources</span></span>
                          <span className="when">Next week</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div>
                    <p className="sect">Market · coast region</p>
                    <div className="card" style={{ margin: 0 }}>
                      <div className="mkt" style={{ padding: "6px 22px 16px" }}>
                        {[["Comp set occupancy", "Festival week, year on year", "+4 pts", "up"],
                          ["City rates, festival dates", "We are asking $395", "$310–$420", ""],
                          ["Air capacity into the coast", "Festival window", "+11%", "up"],
                          ["Our direct booking share", "Comparable hotels run 38%", "22%", "down"]].map(
                          ([t, s, v, cls]) => (
                            <div className="m" key={t}>
                              <div><b>{t}</b><span>{s}</span></div>
                              <div className={"v " + cls}>{v}</div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ---------------------------- APPROVALS ---------------------------- */}
            {tab === "approvals" && (
              <section className="page on">
                <p className="lbl">Approvals · FOP-2210</p>
                <h2>Festival Operating Plan</h2>
                <p className="lede">
                  Raised by N. Sabry, Rooms Division Director. This is the basis on which the
                  hotel trades for the eight festival nights.
                </p>
                <div className="card">
                  <header>
                    <h3>What you are approving</h3>
                    <span className={"pill " + (fopSigned ? "po" : "pw")}>
                      {fopSigned ? "Signed by you · 08:41" : "Awaiting signature"}
                    </span>
                  </header>
                  <div className="figs">
                    <div className="fig"><b className="num">90</b><small>rooms held for the organisers</small></div>
                    <div className="fig"><b className="num">$395</b><small>festival room rate</small></div>
                    <div className="fig"><b className="num">$18,000</b><small>amenity budget, whole festival</small></div>
                  </div>
                  <div className="bd">
                    <div className="note">
                      <p><b>Two rules attached to this plan.</b></p>
                      <p>Everything the organisers ask for goes through the Rooms Division Director.</p>
                      <p>Any extra room, any rate change and any unbudgeted spend needs your written
                        approval before it is promised to anyone.</p>
                    </div>
                  </div>
                  <div className="ft">
                    <button className="btn" disabled={fopSigned} onClick={signFop}>
                      {fopSigned ? "Signed" : "Sign the plan"}
                    </button>
                    <span className="hint">
                      {fopSigned
                        ? "Released to Rooms, F&B, Finance and Procurement."
                        : "Releases it to Rooms, F&B, Finance and Procurement."}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* ------------------------------ ROOMS ------------------------------ */}
            {tab === "rooms" && (
              <section className="page on">
                <p className="lbl">Rooms · commitment register</p>
                <h2>38 rooms were promised without you</h2>
                <p className="lede">And at the jury rate, not the festival rate.</p>

                <div className="card">
                  <header><h3>What it cost the hotel</h3></header>
                  <div className="bd">
                    <p className="sect">The rate</p>
                    <div className="vs">
                      <div className="box"><b className="num">$395</b><small>the festival rate you approved</small></div>
                      <div className="arrow">→</div>
                      <div className="box bad"><b className="num">$255</b><small>the rate these 38 rooms were given</small></div>
                    </div>
                    <p className="sect" style={{ margin: "32px 0 0" }}>The cost</p>
                    <div className="calc">
                      <div className="term"><b className="num">38</b><small>rooms</small></div>
                      <div className="op">×</div>
                      <div className="term"><b className="num">8</b><small>nights</small></div>
                      <div className="op">×</div>
                      <div className="term"><b className="num">$140</b><small>lost on each room, each night</small></div>
                      <div className="op">=</div>
                      <div className="term tot"><b className="num">$42,560</b><small>gone from this year&rsquo;s profit</small></div>
                    </div>
                    <p className="hint" style={{ margin: "18px 0 0" }}>
                      The rooms are sold and the guests are confirmed, so none of it is
                      recoverable. The festival is forecast to contribute about $580,000 of
                      profit — this is <b>7% of the whole eight nights</b>, given away in one
                      afternoon.
                    </p>
                  </div>
                  <div className="ft">
                    <button className="btn" disabled={trailOpen} onClick={() => setTrailOpen(true)}>
                      How did this happen?
                    </button>
                  </div>
                </div>

                {trailOpen && (
                  <div className="card">
                    <header>
                      <h3>The approval trail</h3>
                      <span className="pill pb">Self-approved · rule 2 broken</span>
                    </header>
                    <div className="bd scroll">
                      <table>
                        <tbody>
                          <tr><th>Time</th><th>What happened</th><th>Who</th></tr>
                          <tr>
                            <td className="num">13:40</td>
                            <td>Organisers ask for 38 more rooms, needed by 16:00</td>
                            <td>Festival office</td>
                          </tr>
                          <tr>
                            <td className="num">13:44 · 13:51</td>
                            <td>Two calls to your mobile
                              <span className="sub2">Voicemail. No message, no call to the Executive Office, no word to your assistant.</span>
                            </td>
                            <td>N. Sabry<span className="sub2">Rooms Division Director</span></td>
                          </tr>
                          <tr>
                            <td className="num">13:52</td>
                            <td>Raised in the system</td>
                            <td>N. Sabry<span className="sub2">Rooms Division Director</span></td>
                          </tr>
                          <tr>
                            <td className="num">14:06</td>
                            <td><b style={{ color: "var(--bad)" }}>Approved by the person who raised it.</b>
                              <span className="sub2">Self-approved. No second signature anywhere in the record, and no authority over rate or inventory.</span>
                            </td>
                            <td>N. Sabry<span className="sub2">Rooms Division Director</span></td>
                          </tr>
                          <tr>
                            <td className="num">15:31</td>
                            <td>Confirmed to the organisers in writing
                              <span className="sub2">An hour after you came off the owner&rsquo;s call. Deadline was 16:00.</span>
                            </td>
                            <td>Rooms Division</td>
                          </tr>
                          <tr><td className="num">Two days</td><td>Two morning briefs. Nothing raised with you.</td><td>—</td></tr>
                          <tr>
                            <td className="num">09:14</td>
                            <td><b>You find out</b><span className="sub2">From a procurement variance</span></td>
                            <td>You</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="ft">
                      <button className="btn" disabled={nourCalled} onClick={callNour}>
                        Speak with N. Sabry
                      </button>
                      <span className="hint">
                        Twelve front office colleagues were on shift when it was confirmed.
                      </span>
                    </div>
                  </div>
                )}

                {nourCalled && (
                  <div className="card">
                    <header>
                      <h3>Close CR-0912</h3>
                      <span className={"pill " + (crClosed ? "po" : "pw")}>
                        {crClosed ? "Resolved by you" : "Open"}
                      </span>
                    </header>
                    <div className="bd">
                      <div className="fld" style={{ margin: 0 }}>
                        <label className="f">What did you agree with her? In your own words.</label>
                        <textarea
                          style={{ minHeight: 130 }} value={closure} disabled={crClosed}
                          placeholder="Twelve people saw this happen. What did you commit to, and who else needs to hear it?"
                          onChange={(e) => { setClosure(e.target.value); setCrErr(false); }}
                        />
                      </div>
                    </div>
                    <div className="ft">
                      <button className="btn" disabled={crClosed} onClick={closeCR}>
                        {crClosed ? "Submitted" : "Submit resolution"}
                      </button>
                      <span className="hint">
                        {crErr ? (
                          <b style={{ color: "var(--bad)" }}>Write what you agreed before you submit.</b>
                        ) : crClosed ? (
                          "Copied to N. Sabry, H. Doss, Finance and Procurement."
                        ) : (
                          "This goes on the file exactly as you write it."
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ------------------------------- F&B ------------------------------- */}
            {tab === "fb" && (
              <section className="page on">
                <p className="lbl">F&amp;B deployment · DEP-2210</p>
                <h2>Five people, eight nights</h2>
                <p className="lede">
                  Submitted by T. Nabil for your signature. Move anyone and the reading changes.
                </p>

                <div className="card">
                  <header>
                    <h3>Where the revenue is, and where the strength is</h3>
                    <span className="tag">gold marks a tier A colleague</span>
                  </header>
                  <div className="bd">
                    {STATIONS.map((s) => {
                      const here = people.filter((p) => p.at === s.id);
                      const rs = (s.rev / totalRev) * 100;
                      const xs = (here.reduce((t, p) => t + strength(p), 0) / totalStrength) * 100;
                      return (
                        <div className="stn" key={s.id}>
                          <img className="sthumb" src={s.img} alt="" />
                          <div>
                            <div className="hd">
                              <div>
                                <span className="nm">{s.name}</span>
                                <span className="wn">{s.when}</span>
                              </div>
                              <div className="who">
                                {here.length ? (
                                  here.map((p) => (
                                    <span key={p.n}>
                                      {isTierA(p) && <span className="tA" />}
                                      {p.n}&nbsp;&nbsp;
                                    </span>
                                  ))
                                ) : (
                                  <b style={{ color: "var(--bad)" }}>nobody assigned</b>
                                )}
                              </div>
                            </div>
                            <div className="duo">
                              <div className="mtr">
                                <small>Revenue<b className="num">{rs.toFixed(0)}% · {usd(s.rev)}</b></small>
                                <div className="bar"><i style={{ width: rs.toFixed(1) + "%" }} /></div>
                              </div>
                              <div className="mtr">
                                <small>Team strength<b className="num">{xs.toFixed(0)}%</b></small>
                                <div className="bar g"><i style={{ width: xs.toFixed(1) + "%" }} /></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="card">
                  <header>
                    <h3>The team</h3>
                    <span className="tag">
                      Strength = appraisal + festivals worked · 3 casuals approved against 8 requested
                    </span>
                  </header>
                  <div className="bd scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Colleague</th>
                          <th className="r">Appraisal</th>
                          <th className="r">Festivals worked</th>
                          <th>Station for the festival</th>
                        </tr>
                      </thead>
                      <tbody>
                        {people.map((p, i) => (
                          <tr key={p.n}>
                            <td>
                              {isTierA(p) && <span className="tA" />}
                              <b>{p.n}</b><span className="sub2">{p.r}</span>
                            </td>
                            <td className="r num">{p.a.toFixed(1)}</td>
                            <td className="r num">{p.f}</td>
                            <td>
                              <select value={p.at} disabled={depSigned}
                                      onChange={(e) => reassign(i, e.target.value)}>
                                {STATIONS.map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="ft">
                    <button className="btn gh" disabled={depSigned} onClick={() => setPeople(PEOPLE)}>
                      Restore submitted plan
                    </button>
                  </div>
                </div>

                {!depReviewed && (
                  <div className="card">
                    <div className="bd" style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 240 }}>
                        <h3>Redistribute before you sign</h3>
                        <p className="hint" style={{ margin: "6px 0 0" }}>
                          Move people between stations until the strength sits where the revenue and
                          the nights are. Then talk it through with T. Nabil — he briefs his team at six.
                        </p>
                      </div>
                      <button className="btn" onClick={reviewDone}>I have reviewed the plan</button>
                    </div>
                  </div>
                )}

                {depReviewed && (
                  <>
                    <div className="card" style={{ borderColor: `var(--${verdictTone})` }}>
                      <div className="bd">
                        <h3 style={{ color: `var(--${verdictTone})`, fontSize: 26 }}>
                          {verdictTone === "bad"
                            ? `${galaStrength.toFixed(0)}% of your team's strength is on ${galaRev.toFixed(0)}% of the revenue.`
                            : verdictTone === "warn"
                            ? `Still heavy. ${galaStrength.toFixed(0)}% of the strength on ${galaRev.toFixed(0)}% of the revenue.`
                            : `Balanced. ${galaStrength.toFixed(0)}% of the strength on ${galaRev.toFixed(0)}% of the revenue.`}
                        </h3>
                        <p className="hint" style={{ fontSize: 16.5, margin: "12px 0 0" }}>
                          One night carries {usd(stn("gala").rev)}. The other seven carry{" "}
                          {usd(totalRev - stn("gala").rev)}.
                        </p>
                        {emptyStations.length > 0 && (
                          <div className="note" style={{ marginTop: 18 }}>
                            <p>
                              <b>{emptyRev.toFixed(0)}% of the festival&rsquo;s F&amp;B revenue has no
                              named supervisor at all.</b>{" "}
                              {emptyStations.map((s) => s.name).join(" and ")} are covered by casuals.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="card">
                      <header>
                        <h3>Sign the deployment</h3>
                        <span className={"pill " + (depSigned ? "po" : "pw")}>
                          {depSigned ? "Signed by you" : "Awaiting signature"}
                        </span>
                      </header>
                      <div className="bd">
                        {depSigned &&
                          (moved.length ? (
                            <div className="screen">
                              {moved.map((p) => {
                                const i = people.indexOf(p);
                                return (
                                  <div className="rowl" key={p.n}>
                                    <b>{p.n}</b>
                                    <span>{stn(PEOPLE[i].at).name} → {stn(p.at).name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="note">
                              <p><b>You are signing it exactly as submitted.</b> Nobody has moved.</p>
                            </div>
                          ))}
                      </div>
                      <div className="ft">
                        <button className="btn" disabled={depSigned} onClick={signDep}>
                          {depSigned ? "Signed" : "Sign and release"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>
            )}

            {/* ----------------------------- CHECK-IN ---------------------------- */}
            {tab === "sop" && (
              <section className="page on">
                <p className="lbl">Procedure · VIP arrival</p>
                <h2>Check in a jury or talent guest</h2>
                <p className="lede">Four steps. M. Serry is doing this for the first time tonight.</p>

                <ShareNote title="Share your screen before you start.">
                  He learns this by watching you do it once, not by being told about it.
                </ShareNote>

                <div className="card" style={{ marginTop: 24 }}>
                  <div className="bd" style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <h3>Call one · show him how</h3>
                      <p className="hint" style={{ margin: "6px 0 0" }}>
                        You do the arrival. He watches. Name every field as you fill it.
                      </p>
                    </div>
                    <button className="btn" disabled={serryCalled} onClick={callSerry}>
                      Call M. Serry
                    </button>
                  </div>
                </div>

                <div className="card">
                  <header>
                    <h3>New arrival</h3>
                    <span className="tag">Coast International Film Festival · 22–29 October</span>
                  </header>
                  <div className="bd">
                    <div className="fld">
                      <label className="f">1 · Guest name</label>
                      <input type="text" value={guest} autoComplete="off"
                             placeholder="Enter the guest name"
                             onChange={(e) => setGuest(e.target.value)} />
                    </div>
                    <div className="fld">
                      <label className="f">2 · Rate</label>
                      <input type="text" value={rate} inputMode="numeric" autoComplete="off"
                             placeholder="Jury and talent $255 · all other guests $395"
                             onChange={(e) => { setRate(e.target.value); setRoom(""); }} />
                    </div>
                    <div className="fld">
                      <label className="f">3 · Room</label>
                      <select value={room} onChange={(e) => setRoom(e.target.value)}>
                        {!availableRooms && <option value="">Enter a rate first</option>}
                        {availableRooms && availableRooms.length === 0 && (
                          <option value="">No rooms available at that rate</option>
                        )}
                        {availableRooms && availableRooms.length > 0 && (
                          <>
                            <option value="">Select a room</option>
                            {availableRooms.map((r) => (
                              <option key={r.no} value={r.no}>
                                {r.no} · {r.t}{r.ok ? "" : " · NOT INSPECTED"}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>
                    <button className="btn" onClick={checkIn}>4 · Check in</button>

                    {slip && slip.error && <div className="bad-msg">{slip.error}</div>}
                    {slip && !slip.error && (
                      <div className="slip">
                        <div className="sliphd"><span>Marsa Grand</span><span>Check-in slip</span></div>
                        <div className="slipbd">
                          <div className="sr"><span>Guest</span><b>{slip.guest}</b></div>
                          <div className="sr"><span>Room</span><b>{slip.room.no} · {slip.room.t}</b></div>
                          <div className="sr"><span>Rate</span><b>${slip.room.rate} per night</b></div>
                          <div className="sr"><span>Stay</span><b>22 – 29 October · 8 nights</b></div>
                          <div className="sr"><span>Checked in</span><b>by the General Manager, tonight</b></div>
                        </div>
                        <div className="slipft">Welcome to Marsa Grand</div>
                      </div>
                    )}
                  </div>
                </div>

                {serryCalled && (
                  <div className="card">
                    <div className="bd" style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 240 }}>
                        <h3>Call two · watch him do it</h3>
                        <p className="hint" style={{ margin: "6px 0 0" }}>
                          A second guest is arriving. This time he drives. Keep the screen shared,
                          say nothing, and let him finish.
                        </p>
                      </div>
                      <button className="btn" disabled={monitorCalled} onClick={callMonitor}>
                        Call M. Serry again
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </main>

          <footer>
            MG Connect is a fictional system built for training. Marsa Grand, its people and its
            figures are invented.
          </footer>
        </>
      )}

      <Modal data={modal} onClose={() => setModal(null)} />
    </>
  );
}

/* --------------------------------------------------------------------------
 * Styles. Kept as one string so the component drops into any project without
 * a CSS pipeline, a Tailwind config or a class-name convention to match.
 * Move it to a .css file and import it if you would rather.
 * ------------------------------------------------------------------------ */
const CSS = `
:root{
  /* surfaces — solid navy, depth from cards and shadow only */
  --bg:#0B1524;
  --panel:#132339;
  --panel2:#182B44;
  --raise:linear-gradient(180deg,#16273E 0%,#122134 100%);
  --line:rgba(255,255,255,.075);
  --line2:rgba(255,255,255,.045);

  /* text */
  --ink:#F3F6FA;
  --mid:#BCC7D6;
  --muted:#8C99AC;

  /* brand */
  --gold:#D4AE6E;
  --gold-lt:#EBD9B4;
  --navy:#8FB4E4;
  --deep:#0E1B2C;

  --ok:#57C79B; --okbg:rgba(87,199,155,.13);
  --warn:#E3B95F; --warnbg:rgba(227,185,95,.14);
  --bad:#F08A76; --badbg:rgba(240,138,118,.13);

  --r:14px;
  --sh:0 1px 1px rgba(0,0,0,.2), 0 12px 34px rgba(0,0,0,.34);
  --sh-lg:0 30px 80px rgba(0,0,0,.5);

  box-sizing:border-box;
  padding-top:env(safe-area-inset-top,0px); padding-bottom:env(safe-area-inset-bottom,0px);
}
*,*::before,*::after{box-sizing:inherit}
html{scroll-padding-top:env(safe-area-inset-top,0px);-webkit-text-size-adjust:100%}
body{
  margin:0; background:var(--bg); color:var(--ink);
  font-family:"Inter",Arial,Helvetica,sans-serif;
  font-size:16.5px; font-weight:400; line-height:1.65;
  -webkit-font-smoothing:antialiased;
}
button,input,select,textarea{font-family:inherit;font-size:inherit;color:inherit}
button{cursor:pointer}
.num{font-variant-numeric:tabular-nums}
h1,h2,h3{margin:0;font-family:inherit}
h2{font-size:34px;font-weight:700;letter-spacing:-.022em;line-height:1.2}
h3{font-size:20px;font-weight:600;letter-spacing:-.011em}
.lbl{font-size:11.5px;font-weight:600;letter-spacing:.11em;text-transform:uppercase;color:var(--gold)}
.sm{font-size:15px;color:var(--mid)}
.hint{color:var(--mid);font-size:15.5px;line-height:1.6}
.lede{color:var(--mid);margin:0 0 34px;font-size:18px;max-width:62ch;line-height:1.6}

/* ---------- top bar ---------- */
.top{background:var(--deep);position:sticky;top:0;z-index:40;padding-top:env(safe-area-inset-top,0px);
     border-bottom:1px solid var(--line)}
.top .in{max-width:1080px;margin:0 auto;padding:14px 26px;display:flex;align-items:center;gap:16px}
.brand{display:flex;align-items:center;gap:12px}
.brand img{width:28px}
.brand b{font-size:15px;font-weight:700;letter-spacing:.06em}
.brand i{font-style:normal;display:block;color:var(--gold);font-size:10px;font-weight:600;letter-spacing:.16em;margin-top:1px}
.sp{flex:1}
.cd{font-size:12px;font-weight:600;letter-spacing:.06em;color:var(--gold-lt);background:rgba(212,174,110,.1);
    border:1px solid rgba(212,174,110,.24);padding:7px 15px;border-radius:99px}
@media(max-width:720px){.cd{display:none}}
.acct{position:relative}
.whob{display:flex;align-items:center;gap:11px;background:rgba(255,255,255,.05);border:1px solid var(--line);
      color:var(--ink);padding:6px 14px 6px 6px;border-radius:99px;transition:background .2s,border-color .2s}
.whob:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.16)}
.av{width:32px;height:32px;border-radius:50%;background:var(--gold);color:#12203A;display:grid;place-items:center;
    font-size:12.5px;font-weight:700}
.wt{text-align:left;font-size:11.5px;color:var(--muted);line-height:1.35}
.wt b{display:block;color:var(--ink);font-weight:600;font-size:14.5px}
.drop{position:absolute;right:0;top:calc(100% + 12px);width:min(94vw,410px);background:var(--panel);
      border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--sh-lg);z-index:60;overflow:hidden}
.dtabs{display:flex;border-bottom:1px solid var(--line);background:rgba(0,0,0,.16)}
.dtab{flex:1;background:none;border:0;border-bottom:2px solid transparent;padding:14px 6px;font-size:14px;
      font-weight:500;color:var(--muted);transition:color .18s}
.dtab:hover{color:var(--ink)}
.dtab[aria-selected="true"]{color:var(--ink);border-bottom-color:var(--gold)}
.dbody{max-height:min(60vh,470px);overflow-y:auto;padding:18px}
.sub{margin:22px 0 11px;font-size:11px;font-weight:600;letter-spacing:.13em;color:var(--gold);text-transform:uppercase}
.sub:first-child{margin-top:0}
.onode{background:var(--panel2);border-radius:12px;margin-bottom:11px;overflow:hidden}
.oh{display:grid;grid-template-columns:34px 1fr auto;gap:13px;align-items:center;padding:14px 16px}
.oav{width:34px;height:34px;border-radius:50%;background:rgba(143,180,228,.16);color:var(--navy);
     display:grid;place-items:center;font-size:12px;font-weight:700}
.oh b{display:block;font-size:15.5px;font-weight:600}
.oh span{display:block;font-size:13.5px;color:var(--muted)}
.cnt{text-align:right;font-size:11px;color:var(--muted)}
.cnt b{display:block;font-size:21px;font-weight:700;color:var(--ink)}
.kids{padding:0 16px 14px}
.kid{display:flex;justify-content:space-between;gap:14px;padding:8px 0;font-size:14.5px}
.kid+.kid{border-top:1px solid var(--line2)}
.kid b{font-weight:600}
.kid span{color:var(--muted);text-align:right}

/* ---------- nav ---------- */
.nav{background:var(--bg);border-bottom:1px solid var(--line);position:sticky;top:61px;z-index:30;overflow-x:auto}
.nav .in{max-width:1080px;margin:0 auto;padding:0 26px;display:flex}
.tab{flex:1 1 0;text-align:center;background:none;border:0;border-bottom:2px solid transparent;padding:17px 10px;
     color:var(--muted);font-size:15px;font-weight:500;white-space:nowrap;transition:color .18s,background .18s}
.tab:not([data-lock="1"]):hover{background:rgba(255,255,255,.03)}
.tab:hover{color:var(--ink)}
.tab[aria-selected="true"]{color:var(--ink);border-bottom-color:var(--gold)}
.tab[data-lock="1"]{opacity:.32;cursor:not-allowed}
.dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--bad);margin-left:9px;vertical-align:middle}

main{max-width:1080px;margin:0 auto;padding:46px 26px 100px}
.page{display:none}
.page.on{display:block;animation:fade .34s ease}
@keyframes fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}

/* ---------- cards ---------- */
.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);margin-bottom:24px;
      box-shadow:var(--sh);overflow:hidden}
.card>header{padding:20px 26px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;border-bottom:1px solid var(--line2)}
.card>header .tag{margin-left:auto;font-size:13.5px;color:var(--muted)}
.bd{padding:26px}
.ft{padding:20px 26px;border-top:1px solid var(--line2);background:rgba(0,0,0,.14);
    display:flex;gap:18px;align-items:center;flex-wrap:wrap}

.pill{font-size:11px;font-weight:700;letter-spacing:.09em;padding:6px 13px;border-radius:99px;text-transform:uppercase}
.pw{background:var(--warnbg);color:var(--warn)}
.po{background:var(--okbg);color:var(--ok)}
.pb{background:var(--badbg);color:var(--bad)}

.btn{background:var(--gold);color:#101D31;border:0;padding:14px 26px;border-radius:10px;font-size:15px;
     font-weight:600;letter-spacing:.005em;transition:transform .16s,box-shadow .2s,filter .2s;
     box-shadow:0 6px 18px rgba(212,174,110,.2)}
.btn:hover{transform:translateY(-1px);filter:brightness(1.06);box-shadow:0 10px 26px rgba(212,174,110,.28)}
.btn[disabled]{opacity:.38;cursor:not-allowed;transform:none;box-shadow:none;filter:none}
.btn.gh{background:transparent;color:var(--ink);border:1px solid var(--line);box-shadow:none}
.btn.gh:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.2)}

/* ---------- today ---------- */
.greet{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-bottom:30px}
.ops{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:26px}
.op{background:var(--raise);border:1px solid var(--line);border-radius:12px;padding:20px 22px;box-shadow:var(--sh)}
.op b{display:block;font-size:30px;font-weight:700;letter-spacing:-.02em;line-height:1.15}
.op small{display:block;font-size:14px;color:var(--muted);margin-top:4px}
.inbox{display:flex;gap:20px;align-items:center;padding:26px;cursor:pointer;transition:background .2s}
.inbox:hover{background:rgba(255,255,255,.035)}
.inbox .ic{width:48px;height:48px;border-radius:50%;background:var(--warnbg);color:var(--warn);display:grid;place-items:center;flex:0 0 auto}
.inbox .tx{flex:1;min-width:0}
.inbox .tx b{display:block;font-size:21px;font-weight:600;letter-spacing:-.012em}
.inbox .tx span{display:block;color:var(--mid);font-size:15.5px;margin-top:2px}
.inbox .go{color:var(--gold);font-size:22px}
.feed{padding:8px 26px 20px}
.fitem{display:flex;gap:16px;padding:14px 0;font-size:15.5px;color:var(--mid)}
.fitem+.fitem{border-top:1px solid var(--line2)}
.fitem time{color:var(--muted);font-size:14px;flex:0 0 72px}

/* ---------- figures ---------- */
.figs{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;padding:0}
.fig{background:var(--panel2);border:1px solid var(--line2);border-radius:12px;padding:22px 24px}
.fig b{display:block;font-size:37px;font-weight:700;letter-spacing:-.025em;line-height:1.05}
.fig small{display:block;color:var(--muted);font-size:14.5px;margin-top:7px}
.card>.figs{padding:26px}

.vs{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:22px;text-align:center}
.vs .box{padding:30px 18px;background:var(--panel2);border:1px solid var(--line2);border-radius:12px}
.vs .box.bad{border-color:rgba(240,138,118,.42);background:var(--badbg)}
.vs .box b{display:block;font-size:52px;font-weight:700;letter-spacing:-.03em;line-height:1}
.vs .box.bad b{color:var(--bad)}
.vs .box small{display:block;font-size:14px;color:var(--mid);margin-top:10px}
.vs .arrow{font-size:22px;color:var(--muted)}
@media(max-width:620px){.vs{grid-template-columns:1fr;gap:14px}.vs .arrow{display:none}}

.note{background:var(--panel2);border-left:3px solid var(--gold);border-radius:0 12px 12px 0;padding:20px 22px;font-size:16px;color:var(--mid)}
.note b{font-weight:600;color:var(--ink)}
.note p{margin:0 0 9px}.note p:last-child{margin:0}

/* ---------- calculation strip ---------- */
.calc{display:flex;align-items:stretch;gap:10px;flex-wrap:wrap;margin-top:16px}
.calc .term{flex:1 1 130px;background:var(--panel2);border:1px solid var(--line2);border-radius:12px;padding:18px 16px;text-align:center}
.calc .term b{display:block;font-size:30px;font-weight:700;letter-spacing:-.02em;line-height:1.1}
.calc .term small{display:block;font-size:13.5px;color:var(--muted);margin-top:5px;line-height:1.35}
.calc .term.tot{background:var(--badbg);border-color:rgba(240,138,118,.45)}
.calc .term.tot b{color:var(--bad);font-size:34px}
.calc .op{display:grid;place-items:center;font-size:20px;color:var(--muted);padding:0 2px}
@media(max-width:620px){.calc .op{display:none}}
.cols2{display:grid;grid-template-columns:1.35fr 1fr;gap:24px;align-items:start}
@media(max-width:860px){.cols2{grid-template-columns:1fr}}
.sect{font-size:13px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0 0 14px}

/* ---------- tables ---------- */
table{width:100%;border-collapse:collapse;font-size:16px}
th{text-align:left;font-size:11.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);
   padding:0 14px 14px;border-bottom:1px solid var(--line)}
td{padding:16px 14px;border-bottom:1px solid var(--line2)}
td b{font-weight:600}
td .sub2{display:block;color:var(--muted);font-size:14px;margin-top:1px}
tr:last-child td{border-bottom:0}
td.r,th.r{text-align:right}
.scroll{overflow-x:auto}

.locked{text-align:center;padding:78px 26px;color:var(--muted);font-size:16px}
.locked b{display:block;color:var(--ink);font-size:21px;font-weight:600;margin-bottom:9px}

/* ---------- forms ---------- */
label.f{display:block;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:9px}
select,textarea,input[type=text]{width:100%;padding:14px 16px;border:1px solid var(--line);border-radius:10px;
  background:rgba(0,0,0,.2);color:var(--ink);font-weight:400;transition:border-color .18s,box-shadow .18s,background .18s}
select:hover,textarea:hover,input:hover{border-color:rgba(255,255,255,.16)}
select:focus,textarea:focus,input:focus{outline:0;border-color:var(--gold);background:rgba(0,0,0,.26);
  box-shadow:0 0 0 3px rgba(212,174,110,.16)}
::placeholder{color:var(--muted);opacity:.75}
textarea{min-height:92px;resize:vertical;line-height:1.6}
.fld{margin-bottom:22px}
option{background:#132339;color:var(--ink)}

/* ---------- deployment ---------- */
.stn{padding:20px 0;display:grid;grid-template-columns:140px 1fr;gap:20px;align-items:start}
.stn+.stn{border-top:1px solid var(--line2)}
.sthumb{width:140px;height:78px;object-fit:cover;border-radius:10px;border:1px solid var(--line2)}
@media(max-width:620px){.stn{grid-template-columns:1fr}.sthumb{width:100%;height:120px}}
.stn .hd{display:flex;justify-content:space-between;gap:18px;align-items:baseline;margin-bottom:14px;flex-wrap:wrap}
.stn .nm{font-size:19px;font-weight:600;letter-spacing:-.012em}
.stn .wn{display:block;font-size:14px;color:var(--muted);font-weight:400}
.stn .who{font-size:15px;color:var(--mid);text-align:right}
.duo{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.mtr small{font-size:12px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);
  display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.mtr small b{font-size:17px;font-weight:700;letter-spacing:-.01em;color:var(--ink);text-transform:none}
.bar{height:8px;background:rgba(0,0,0,.28);border-radius:99px;margin-top:9px;overflow:hidden}
.bar i{display:block;height:100%;background:linear-gradient(90deg,#5E8BC4,#8FB4E4);transition:width .45s cubic-bezier(.2,.8,.3,1)}
.bar.g i{background:linear-gradient(90deg,#C09A56,#EBD9B4)}
.tA{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--gold);margin-right:9px;vertical-align:middle}

/* ---------- steps ---------- */
.stp{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);margin-bottom:20px;box-shadow:var(--sh);overflow:hidden}
.sh{display:grid;grid-template-columns:48px 1fr;gap:20px;align-items:center;padding:24px 26px;background:var(--raise)}
.sn{width:48px;height:48px;border-radius:50%;background:rgba(212,174,110,.14);border:1px solid rgba(212,174,110,.4);
    color:var(--gold);display:grid;place-items:center;font-size:19px;font-weight:700}
.stp.ok .sn{background:var(--gold);color:#101D31;border-color:var(--gold)}
.sh h3{font-size:20px}
.sh span.d{display:block;font-size:15.5px;color:var(--mid);margin-top:3px;line-height:1.55}
.screen{background:rgba(0,0,0,.2);border:1px solid var(--line2);border-radius:12px;padding:22px 24px}
.rowl{display:flex;justify-content:space-between;gap:16px;padding:13px 0;font-size:16px}
.rowl+.rowl{border-top:1px solid var(--line2)}
.rowl b{font-weight:600}
.rowl span{color:var(--mid);text-align:right}
.chk{display:flex;gap:14px;align-items:flex-start;padding:14px 0;font-size:16px}
.chk+.chk{border-top:1px solid var(--line2)}
.chk input{width:19px;height:19px;margin-top:3px;flex:0 0 auto;accent-color:var(--gold)}
.slip{background:var(--panel2);border:1px solid var(--gold);border-radius:12px;margin-top:22px;overflow:hidden}
.sliphd{display:flex;justify-content:space-between;align-items:center;gap:14px;background:var(--gold);color:#12203A;
        padding:13px 22px;font-size:13px;font-weight:700;letter-spacing:.09em;text-transform:uppercase}
.slipbd{padding:8px 22px}
.sr{display:flex;justify-content:space-between;gap:16px;padding:13px 0;font-size:16px}
.sr+.sr{border-top:1px solid var(--line2)}
.sr span{color:var(--muted)}
.sr b{font-weight:600;text-align:right}
.slipft{padding:14px 22px;border-top:1px solid var(--line2);color:var(--muted);font-size:14px;text-align:center}
.ok-msg{background:var(--okbg);color:var(--ok);border:1px solid rgba(87,199,155,.3);border-radius:10px;padding:16px 20px;font-size:16px;margin-top:20px}
.bad-msg{background:var(--badbg);color:var(--bad);border:1px solid rgba(240,138,118,.3);border-radius:10px;padding:16px 20px;font-size:16px;margin-top:20px}

/* ---------- modal ---------- */
.ov{position:fixed;inset:0;background:rgba(5,10,18,.72);backdrop-filter:blur(5px);display:grid;place-items:center;
    padding:22px;z-index:90;opacity:0;pointer-events:none;transition:opacity .28s}
.ov.on{opacity:1;pointer-events:auto}
.mdl{background:var(--panel);border:1px solid var(--line);border-radius:18px;max-width:540px;width:100%;
     box-shadow:var(--sh-lg);transform:translateY(16px) scale(.975);
     transition:transform .34s cubic-bezier(.2,.8,.3,1);overflow:hidden}
.ov.on .mdl{transform:none}
.mdl .mh{padding:30px 32px 0}
.mdl .mi{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;margin-bottom:20px}
.mi.red{background:var(--badbg);color:var(--bad)}
.mi.gold{background:var(--warnbg);color:var(--gold)}
.mdl h3{font-size:25px;font-weight:700;letter-spacing:-.02em;line-height:1.28;margin-bottom:12px}
.mdl p{margin:0;color:var(--mid);font-size:17px;line-height:1.6}
.mdl p b{color:var(--ink);font-weight:600}
.mdl .mb{padding:24px 32px 0}
.mdl .mf{padding:28px 32px 30px;display:flex;gap:12px;flex-wrap:wrap}
.shr{background:var(--warnbg);border:1px solid rgba(227,185,95,.4);border-radius:12px;padding:16px 20px;
      margin-bottom:14px;font-size:15.5px;color:var(--mid)}
.shr b{display:block;color:var(--warn);font-size:16.5px;font-weight:700;margin-bottom:4px}
.meetrow{display:flex;align-items:center;gap:16px;background:var(--panel2);border:1px solid var(--line2);
         border-radius:12px;padding:18px 20px}
.meetrow b{display:block;font-size:17px;font-weight:600}
.meetrow span{display:block;font-size:14px;color:var(--muted)}
a.join{margin-left:auto;background:var(--gold);color:#101D31;text-decoration:none;padding:12px 22px;border-radius:10px;
       font-size:14.5px;font-weight:600;white-space:nowrap;box-shadow:0 6px 18px rgba(212,174,110,.2)}
a.join:hover{filter:brightness(1.07)}

footer{max-width:1080px;margin:0 auto;padding:0 26px 54px;color:var(--muted);font-size:14px}

/* ---------- sign-in gate ---------- */
.gate{position:fixed;inset:0;z-index:120;background:var(--bg);display:grid;place-items:center;padding:26px;
      overflow-y:auto;transition:opacity .45s ease}
.gate.out{opacity:0;pointer-events:none}
.gwrap{width:min(620px,100%);background:var(--panel);
       border:1px solid var(--line);border-radius:20px;overflow:hidden;box-shadow:var(--sh-lg)}
.gimg{position:relative}
.gimg img{width:100%;height:auto;display:block}
.gform{padding:34px 38px 36px}
.glogo{display:flex;align-items:center;gap:12px;margin-bottom:30px}
.glogo img{width:34px}
.glogo b{display:block;font-size:15px;font-weight:700;letter-spacing:.06em}
.glogo i{font-style:normal;display:block;color:var(--gold);font-size:10px;font-weight:600;letter-spacing:.16em;margin-top:1px}
.gform h1{font-size:29px;font-weight:700;letter-spacing:-.024em;line-height:1.22;margin-bottom:14px}
.gform .gp{color:var(--mid);font-size:16.5px;margin:0 0 24px;line-height:1.6}
.glist{list-style:none;margin:0 0 30px;padding:0}
.glist li{display:flex;gap:13px;align-items:flex-start;padding:10px 0;font-size:15.5px;color:var(--mid)}
.glist li+li{border-top:1px solid var(--line2)}
.glist .gi{width:26px;height:26px;border-radius:50%;background:rgba(212,174,110,.14);color:var(--gold);
           display:grid;place-items:center;flex:0 0 auto;font-size:13px;font-weight:700}
.gfine{color:var(--muted);font-size:13.5px;margin:20px 0 0}
@media(max-width:820px){.gform{padding:28px 22px 26px}.gform h1{font-size:24px}}

/* ---------- today layout ---------- */
.todo{list-style:none;margin:0;padding:0}
.todo li{display:flex;gap:16px;align-items:center;padding:16px 26px;font-size:16px}
.todo li+li{border-top:1px solid var(--line2)}
.todo .tk{width:22px;height:22px;border-radius:6px;border:1.5px solid var(--line);display:grid;place-items:center;
          flex:0 0 auto;color:var(--muted);font-size:12px}
.todo li.done .tk{background:var(--okbg);border-color:rgba(87,199,155,.4);color:var(--ok)}
.todo li.done .tt{color:var(--muted);text-decoration:line-through;text-decoration-color:rgba(255,255,255,.2)}
.todo .tt{flex:1;min-width:0}
.todo .tt b{display:block;font-weight:600}
.todo .tt span{display:block;font-size:14.5px;color:var(--muted)}
.todo .when{font-size:13.5px;color:var(--muted);white-space:nowrap}
.todo li.act{cursor:pointer;background:rgba(227,185,95,.06);transition:background .2s}
.todo li.act:hover{background:rgba(227,185,95,.11)}
.todo li.act .tk{border-color:rgba(227,185,95,.55);color:var(--warn)}
.mkt{padding:6px 26px 22px}
.mkt .m{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:baseline;padding:15px 0}
.mkt .m+.m{border-top:1px solid var(--line2)}
.mkt .m b{font-weight:600;font-size:16px}
.mkt .m span{display:block;font-size:14.5px;color:var(--muted);margin-top:2px}
.mkt .v{font-size:19px;font-weight:700;letter-spacing:-.015em;white-space:nowrap}
.up{color:var(--ok)}.down{color:var(--bad)}

@media(max-width:760px){
  main{padding:32px 18px 80px}
  .top .in,.nav .in,footer{padding-left:18px;padding-right:18px}
  .nav{top:57px}
  h2{font-size:28px}
  .duo{grid-template-columns:1fr}
  .bd,.card>.figs{padding:20px}
  .card>header,.ft{padding:18px 20px}
}
`;
