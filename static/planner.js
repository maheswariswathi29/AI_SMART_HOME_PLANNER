(() => {
  const steps = [
    { title:"Tell us about your home", eyebrow:"START WITH THE BASICS", note:"Start with the people, place and spaces that make it yours.", button:"Choose your palette" },
    { title:"Set the mood", eyebrow:"YOUR HOME, YOUR FEELING", note:"Pick a paint story, then choose finishes that feel like you.", button:"Choose materials" },
    { title:"Choose your materials", eyebrow:"THE DETAILS THAT LAST", note:"A few tactile choices help us give your design its own character.", button:"Set Vastu preferences" },
    { title:"Vastu & room directions", eyebrow:"A THOUGHTFUL HOME BRIEF", note:"Choose the directions you prefer. We’ll carry them into your guidance and plan.", button:"Generate my home" }
  ];
  const palettes = {
    linen:{title:"Soft linen",caption:"Warm whites, sage and natural oak",wall:"#eee5d3",accent:"#a8b4a1",roof:"#798575"},
    coastal:{title:"Coastal calm",caption:"Sea glass, airy whites and sand",wall:"#e8eee8",accent:"#91aaa6",roof:"#687e7c"},
    clay:{title:"Clay & olive",caption:"Terracotta, olive and earthy neutrals",wall:"#e9dacc",accent:"#a45f45",roof:"#706c55"},
    dusk:{title:"Evening dusk",caption:"Quiet blue, charcoal and soft ivory",wall:"#d9dbe0",accent:"#7a8796",roof:"#505963"},
    garden:{title:"Garden room",caption:"Leafy green, cream and warm wood",wall:"#e6e8d9",accent:"#788c62",roof:"#566e57"},
    blush:{title:"Blush & walnut",caption:"Gentle rose, walnut and soft cream",wall:"#f0dfd9",accent:"#bc8174",roof:"#6c5b55"}
  };
  const budgetRates = {
    "MVP Colony":{Basic:[1300,1300],Standard:[1650,1950],Premium:[2150,2500]},
    "Seethammadhara":{Basic:[1200,1200],Standard:[1500,1800],Premium:[2000,2350]},
    "Madhurawada":{Basic:[1150,1150],Standard:[1450,1750],Premium:[1950,2300]},
    "Kommadi":{Basic:[1100,1100],Standard:[1400,1650],Premium:[1850,2150]},
    "Gajuwaka":{Basic:[1050,1050],Standard:[1350,1600],Premium:[1750,2100]},
    "Pendurthi":{Basic:[1050,1050],Standard:[1350,1550],Premium:[1700,2050]},
    "Anandapuram":{Basic:[1050,1050],Standard:[1350,1550],Premium:[1700,2050]},
    "general":{Basic:[1050,1300],Standard:[1350,1750],Premium:[1950,2500]}
  };
  let current = 0;
  const panels = [...document.querySelectorAll(".form-stage")];
  const nav = document.getElementById("stepNav");
  const form = document.getElementById("wizardForm");
  const next = document.getElementById("nextButton");
  const submit = document.getElementById("submitButton");
  const back = document.getElementById("backButton");

  function renderNav(){
    nav.innerHTML = steps.map((step,i)=>`<button class="step-link ${i===current?"active":""} ${i<current?"done":""}" type="button" data-step="${i}" ${i>current?"disabled":""}><span class="step-num">${i<current?"✓":`0${i+1}`}</span><span class="step-txt"><strong>${["Home basics","Colors & interiors","Materials & finishes","Vastu guidance"][i]}</strong><small>${["Rooms & orientation","Paint & interior style","Floor, wall & frame","Suggestions & design"][i]}</small></span></button>`).join("");
    nav.querySelectorAll("button:not([disabled])").forEach(button=>button.addEventListener("click",()=>show(Number(button.dataset.step))));
  }
  function show(index){
    current=Math.max(0,Math.min(steps.length-1,index));
    panels.forEach((panel,i)=>panel.hidden=i!==current);
    document.getElementById("stageLabel").textContent=steps[current].eyebrow;
    document.getElementById("stageTitle").textContent=steps[current].title;
    document.getElementById("stageDescription").textContent=steps[current].note;
    back.hidden=current===0; next.hidden=current===steps.length-1; submit.hidden=current!==steps.length-1;
    next.innerHTML=`${steps[current].button} <span>→</span>`;
    document.getElementById("footerHint").textContent=current===3?"Your choices now generate one connected design.":"You can revisit earlier choices.";
    renderNav();
  }
  function validArea(){
    const input=document.getElementById("area"), unit=document.getElementById("area_unit").value, n=Number(input.value);
    const low=unit==="sq m"?74:800, high=unit==="sq m"?232:2500;
    input.min=String(low); input.max=String(high);
    if(!Number.isFinite(n)||n<low||n>high){input.setCustomValidity(`Enter an area between ${low} and ${high} ${unit}.`);input.reportValidity();input.setCustomValidity("");return false;}
    return true;
  }
  function updateBudgetPreview(){
    const area=Number(document.getElementById("area").value), unit=document.getElementById("area_unit").value;
    if(!Number.isFinite(area)||area<=0)return;
    const sqft=Math.round(area*(unit==="sq m"?10.7639:1));
    const quality=document.querySelector('input[name="material_quality"]:checked')?.value||"Standard";
    const location=document.getElementById("location").value;
    const [low,high]=(budgetRates[location]||budgetRates.general)[quality];
    const money=value=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(value);
    const box=document.getElementById("liveBudget");
    if(box){box.querySelector("strong").textContent=`${money(sqft*low)} – ${money(sqft*high)}`;box.querySelector(".budget-subtitle").textContent=`${location} · ${quality} quality · ${sqft.toLocaleString("en-IN")} sq ft`;}
  }
  next.addEventListener("click",()=>{if(current===0&&!validArea())return;show(current+1);document.querySelector(".workspace").scrollIntoView({behavior:"smooth",block:"start"});});
  back.addEventListener("click",()=>show(current-1));
  document.getElementById("area_unit").addEventListener("change",event=>{
    const metric=event.target.value==="sq m", area=document.getElementById("area"), hint=document.getElementById("areaHint");
    area.min=metric?"74":"800";area.max=metric?"232":"2500";
    area.value=metric?"140":"1500"; hint.textContent=metric?"Estimate range: 74–232 sq m.":"Estimate range: 800–2,500 sq ft.";
    document.querySelectorAll(".unit-label").forEach(label=>label.textContent=metric?"sq m":"sq ft");
    for(const id of ["garden_area","parking_area","balcony_area"])document.getElementById(id).step=metric?"1":"10";
    document.getElementById("garden_area").value=metric?"17":"180";
    document.getElementById("parking_area").value=metric?"23":"250";
    document.getElementById("balcony_area").value="0";
    updateBudgetPreview();
  });
  function freshBudget(){try{sessionStorage.removeItem("nivasa-estimate-reviewed");}catch{}updateBudgetPreview();}
  for(const id of ["area","location"])document.getElementById(id).addEventListener("input",freshBudget);
  document.getElementById("location").addEventListener("change",freshBudget);
  document.querySelectorAll('input[name="material_quality"]').forEach(input=>input.addEventListener("change",freshBudget));
  function choosePalette(id){
    const p=palettes[id]; if(!p)return;
    document.getElementById("palette_name").value=p.title;
    document.getElementById("palette_id").value=id;
    document.getElementById("wall_color").value=p.wall;document.getElementById("accent_color").value=p.accent;
    document.getElementById("paletteCaption").textContent=p.caption;
    document.getElementById("previewTitle").textContent=`${p.title} · a thoughtful color pairing`;
    document.getElementById("previewCaption").textContent=p.caption;
    document.getElementById("miniHouse").style.setProperty("--wall",p.wall);document.getElementById("miniHouse").style.setProperty("--accent",p.accent);
    document.getElementById("miniHouse").style.setProperty("--roof",p.roof);
    document.querySelectorAll(".palette-card").forEach(label=>{const roof=palettes[label.querySelector("input").value].roof;label.style.setProperty("--roof",roof);});
  }
  document.querySelectorAll('input[name="palette"]').forEach(input=>input.addEventListener("change",()=>choosePalette(input.value)));
  for(const id of ["wall_color","accent_color"]){document.getElementById(id).addEventListener("input",()=>{
    document.getElementById("palette_name").value="Custom colours";
    document.getElementById("palette_id").value="custom";
    document.getElementById("previewTitle").textContent="Your own color pairing";
    document.getElementById("previewCaption").textContent="A personal combination, ready to carry into your plan.";
    document.getElementById("miniHouse").style.setProperty(id==="wall_color"?"--wall":"--accent",document.getElementById(id).value);
    document.querySelectorAll('input[name="palette"]').forEach(input=>input.checked=false);
  });}
  const wizardForm=document.getElementById("wizardForm");
  function resetReviewedEstimate(){
    const box=document.getElementById("liveBudget");if(!box)return;
    box.querySelector("strong").textContent="Ready for a fresh estimate";
    box.querySelector(".budget-subtitle").textContent="Previous estimate reviewed · change your choices to calculate again.";
  }
  window.addEventListener("pageshow",()=>{
    try{if(sessionStorage.getItem("nivasa-estimate-reviewed")==="1"){resetReviewedEstimate();sessionStorage.removeItem("nivasa-estimate-reviewed");}}catch{}
  });
  wizardForm.addEventListener("submit",event=>{
    if(!validArea()){event.preventDefault();show(0);return;}
    try{sessionStorage.setItem("nivasa-estimate-reviewed","1");}catch{}
  });
  document.querySelectorAll('input[name="palette"]').forEach(input=>{if(input.checked)choosePalette(input.value);});
  updateBudgetPreview();
  show(0);
})();
