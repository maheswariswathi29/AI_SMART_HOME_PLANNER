(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const palettes = {
    linen: { name: "Soft linen", wall: "#eee5d3", accent: "#a8b4a1", trim: "#f8f4e9", floor: "#d6bd98", roof: "#798575", description: "Warm whites, sage and natural oak" },
    coastal: { name: "Coastal calm", wall: "#e8eee8", accent: "#91aaa6", trim: "#f8f7ef", floor: "#cdbb9e", roof: "#687e7c", description: "Sea glass, airy whites and sand" },
    clay: { name: "Clay & olive", wall: "#e9dacc", accent: "#a45f45", trim: "#f4eee3", floor: "#ad8a68", roof: "#706c55", description: "Terracotta, olive and earthy neutrals" },
    dusk: { name: "Evening dusk", wall: "#d9dbe0", accent: "#7a8796", trim: "#f0eee8", floor: "#9f9588", roof: "#505963", description: "Quiet blue, charcoal and soft ivory" },
    garden: { name: "Garden room", wall: "#e6e8d9", accent: "#788c62", trim: "#f8f4e9", floor: "#c8b391", roof: "#566e57", description: "Leafy green, cream and warm wood" },
    blush: { name: "Blush & walnut", wall: "#f0dfd9", accent: "#bc8174", trim: "#fff8ef", floor: "#987557", roof: "#6c5b55", description: "Gentle rose, walnut and soft cream" }
  };
  const styles = ["Modern organic", "Scandinavian", "Warm contemporary", "Indian modern", "Japandi", "Classic home"];
  const styleInfo = ["Soft shapes · natural texture", "Light wood · calm simplicity", "Layered neutrals · comfort", "Craft · pattern · warmth", "Quiet lines · tactile calm", "Timeless details · balance"];
  const stateDefaults = {
    step: 0, name: "", location: "", area: 1500, unit: "sq ft", facing: "North", floors: 1,
    bedrooms: 3, bathrooms: 2, balcony: true, garden: false, gardenArea: 0, parking: 1, parkingArea: 250,
    palette: "linen", wallColor: palettes.linen.wall, accentColor: palettes.linen.accent,
    interior: "Modern organic", furniture: "Comfortable", floorMaterial: "Warm tile", wallFinish: "Smooth plaster", roofMaterial: "Concrete slab", windowMaterial: "Aluminium", landscape: "Low upkeep"
  };
  const readSaved = () => { try { return { ...stateDefaults, ...JSON.parse(localStorage.getItem("hearth-home") || "{}") }; } catch { return { ...stateDefaults }; } };
  let state = readSaved();
  let view = "2d";
  let selectedFloor = 1;
  let statusTimer;
  const steps = [
    { title: "Tell us about your home", short: "Home basics", sub: "Start with the people, place and spaces that make it yours.", eyebrow: "START WITH THE BASICS", button: "Choose your palette" },
    { title: "Set the mood", short: "Colors & interiors", sub: "Pick a paint story, then choose the interior style that feels like you.", eyebrow: "YOUR HOME, YOUR FEELING", button: "Choose materials" },
    { title: "Choose your materials", short: "Materials & finishes", sub: "A few tactile choices help us give your design its own character.", eyebrow: "THE DETAILS THAT LAST", button: "Explore your design" },
    { title: "Explore your home", short: "Vastu & layout", sub: "Your selections come together in one adaptable floor plan and 3D cutaway.", eyebrow: "YOUR DESIGN, BROUGHT TO LIFE", button: "← Edit materials" }
  ];
  function save() { localStorage.setItem("hearth-home", JSON.stringify(state)); const label = $(".save-state"); if (label) { label.innerHTML = "<i></i> Just saved"; clearTimeout(statusTimer); statusTimer = setTimeout(() => label.innerHTML = "<i></i> Saved on this device", 1600); } }
  function esc(value) { return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])); }
  function renderNav() {
    $("#stepCount").textContent = `${String(state.step+1).padStart(2,"0")} / ${String(steps.length).padStart(2,"0")}`;
    $("#stepNav").innerHTML = steps.map((s,i)=>`<button type="button" class="step-link ${i===state.step?"active":""} ${i<state.step?"done":""}" data-step="${i}" ${i>state.step?"disabled":""}><span class="step-num">${i<state.step?"✓":`0${i+1}`}</span><span class="step-txt"><strong>${s.short}</strong><small>${["Rooms & orientation","Paint & interior style","Floor, wall & frame","Vastu, plan & 3D"][i]}</small></span></button>`).join("");
    $$(".step-link:not([disabled])").forEach(b=>b.addEventListener("click",()=>goStep(Number(b.dataset.step))));
  }
  function render() {
    renderNav(); const cfg=steps[state.step];
    $("#stepEyebrow").textContent=cfg.eyebrow; $("#stepTitle").textContent=cfg.title; $("#stepIntro").textContent=cfg.sub;
    $("#backButton").hidden=state.step===0; $("#nextButton").innerHTML=state.step===steps.length-1?`<span>←</span> Edit materials`:`${cfg.button} <span>→</span>`;
    $("#footerHint").textContent=state.step===3?"Your plan is saved automatically.":"You can change these details later.";
    $("#stepContent").innerHTML=[renderBasics,renderPalette,renderMaterials,renderResult][state.step]();
    bindFields(); if(state.step===3) bindResult();
  }
  function field(label,key,placeholder="",type="text",unit="",hint="") { const input=type==="select"?`<select data-key="${key}">${(key==="unit"?["sq ft","sq m"]:key==="facing"?["North","North-East","East","South-East","South","South-West","West","North-West"]:[]).map(v=>`<option ${state[key]===v?"selected":""}>${v}</option>`).join("")}</select>`:`<div class="unit-wrap"><input data-key="${key}" type="${type}" ${type==="number"?`min="${key==="floors"?1:0}" max="${key==="floors"?5:99999}" step="${key==="area"?50:1}"`:""} placeholder="${placeholder}" value="${esc(state[key]??"")}" ${key==="name"||key==="location"?"":""}/>${unit?`<span class="unit">${unit}</span>`:""}</div>`; return `<div class="field"><label>${label}</label>${input}${hint?`<small>${hint}</small>`:""}</div>`; }
  function renderBasics(){
    return `<div class="field-grid">${field("Your name (optional)","name","e.g. Aanya")}${field("City or location","location","e.g. Bengaluru")}${field("Built-up area","area","1500","number",state.unit)}${field("Area unit","unit","","select")}${field("Number of floors","floors","1","number","","Up to 5 floors")}${field("Bedrooms","bedrooms","3","number")}${field("Bathrooms","bathrooms","2","number")}</div>
      <div class="section-divider"><span>OUTDOOR SPACES & ORIENTATION</span></div><div class="inline-fields">
      <div class="field"><label>Home facing</label><select data-key="facing">${["North","North-East","East","South-East","South","South-West","West","North-West"].map(x=>`<option ${state.facing===x?"selected":""}>${x}</option>`).join("")}</select></div>
      <div class="field"><label>Balcony</label><div class="segmented">${[[true,"Yes"],[false,"No"]].map(([v,t])=>`<label><input type="radio" name="balcony" data-key="balcony" value="${v}" ${state.balcony===v?"checked":""}/><span>${t}</span></label>`).join("")}</div></div>
      <div class="field"><label>Garden</label><div class="segmented">${[[true,"Yes"],[false,"No"]].map(([v,t])=>`<label><input type="radio" name="garden" data-key="garden" value="${v}" ${state.garden===v?"checked":""}/><span>${t}</span></label>`).join("")}</div></div>
      <div class="field"><label>Garden area (optional)</label><div class="unit-wrap"><input data-key="gardenArea" type="number" min="0" step="10" value="${state.gardenArea}"/><span class="unit">${state.unit}</span></div></div>
      <div class="field"><label>Parking spaces</label><select data-key="parking">${[0,1,2,3].map(x=>`<option value="${x}" ${Number(state.parking)===x?"selected":""}>${x===0?"None":x===1?"1 car":`${x} cars`}</option>`).join("")}</select></div>
      <div class="field"><label>Parking area (optional)</label><div class="unit-wrap"><input data-key="parkingArea" type="number" min="0" step="10" value="${state.parkingArea}"/><span class="unit">${state.unit}</span></div></div></div>
      <div class="insight-box"><span class="insight-symbol">✳</span><div><b>A flexible starting point</b><br />We’ll create a concept layout from these room counts. You can explore how the rooms fit, then revisit any choice.</div></div>`;
  }
  function renderPalette(){
    const chips=Object.entries(palettes).map(([id,p])=>`<label class="palette-card"><input type="radio" name="palette" data-key="palette" value="${id}" ${state.palette===id?"checked":""}/><span class="palette-inner"><span class="palette-swatch">${[p.wall,p.accent,p.trim,p.floor,p.roof].map(c=>`<i style="background:${c}"></i>`).join("")}</span><strong>${p.name}</strong><small>${p.description}</small></span></label>`).join("");
    const stylesHtml=styles.map((s,i)=>`<label class="design-card"><input type="radio" name="interior" data-key="interior" value="${s}" ${state.interior===s?"checked":""}/><span class="design-inner"><span class="design-visual"><span>${["🛋️","🪴","🪵","🧵","🍵","🕯️"][i]}</span></span><strong>${s}</strong><small>${styleInfo[i]}</small></span></label>`).join("");
    return `<div class="group-label" style="margin-bottom:9px">PICK A PAINT STORY</div><div class="card-grid">${chips}</div>
      <div class="custom-colors"><label class="color-field">Main wall <input type="color" data-key="wallColor" value="${state.wallColor}" /></label><label class="color-field">Accent <input type="color" data-key="accentColor" value="${state.accentColor}" /></label><span class="palette-selected" id="paletteDescription">${palettes[state.palette]?.description||"Your own color pairing"}</span></div>
      <div class="live-preview"><div class="preview-house" id="previewHouse" style="--preview-wall:${state.wallColor};--preview-roof:${palettes[state.palette]?.roof||"#718171"}"></div><div class="preview-info"><strong>First glimpse of your palette</strong><p id="previewName">${esc(palettes[state.palette]?.name||"Custom colors")} · main walls and a thoughtful accent</p><span class="preview-dots"><i style="background:${state.wallColor}"></i><i style="background:${state.accentColor}"></i><i style="background:${palettes[state.palette]?.floor}"></i><i style="background:${palettes[state.palette]?.roof}"></i></span></div></div>
      <div class="section-divider"><span>YOUR INTERIOR MOOD</span></div><div class="design-grid">${stylesHtml}</div>
      <div class="choice-section"><span class="group-label">FURNITURE FEEL</span><div class="control-row">${["Comfortable","Space-saving","Statement pieces"].map(v=>`<span class="choice-chip"><input type="radio" name="furniture" data-key="furniture" id="f-${v.replaceAll(" ","-")}" value="${v}" ${state.furniture===v?"checked":""}/><label for="f-${v.replaceAll(" ","-")}">${v}</label></span>`).join("")}</div></div>`;
  }
  const materialGroups=[
    ["FLOORING","floorMaterial",["Warm tile","Wood-look plank","Natural stone","Polished concrete"]],
    ["WALL FINISH","wallFinish",["Smooth plaster","Limewash","Textured paint","Exposed brick accent"]],
    ["ROOF / CEILING","roofMaterial",["Concrete slab","Pitched tile roof","Metal standing seam"]],
    ["WINDOW FRAMES","windowMaterial",["Aluminium","Timber","uPVC"]]
  ];
  function renderMaterials(){
    const stack=materialGroups.map(([title,key,options])=>`<div><span class="group-label">${title}</span><div class="card-grid">${options.map((v,i)=>`<label class="material-card"><input type="radio" name="${key}" data-key="${key}" value="${v}" ${state[key]===v?"checked":""}/><span class="material-inner"><span class="material-visual" style="${key==="floorMaterial"&&i===1?"background:repeating-linear-gradient(90deg,#a98259 0 3px,#d6bd98 3px 32px)":""}${key==="floorMaterial"&&i===2?"background:linear-gradient(135deg,#a69d8e,#e2ddd2)":""}${key==="wallFinish"&&i===3?"background:repeating-linear-gradient(0deg,#9c7056 0 7px,#d5c3a8 7px 10px)":""}"></span><strong>${v}</strong></span></label>`).join("")}</div></div>`).join("");
    return `<div class="material-layout"><div class="material-stack">${stack}</div><div><div class="group-label">LANDSCAPE APPROACH</div><div class="control-row">${["Low upkeep","Lush & layered","Edible garden"].map((v,i)=>`<span class="choice-chip"><input type="radio" name="landscape" data-key="landscape" id="land-${i}" value="${v}" ${state.landscape===v?"checked":""}/><label for="land-${i}">${v}</label></span>`).join("")}</div><div class="live-preview" style="display:block;margin-top:20px"><strong style="font-size:10px">Your finish palette</strong><div class="preview-dots" style="margin:9px 0">${[state.wallColor,state.accentColor,palettes[state.palette]?.floor||"#d6bd98",palettes[state.palette]?.roof||"#798575"].map(c=>`<i style="background:${c}"></i>`).join("")}</div><p class="material-note">${esc(state.floorMaterial)} floors · ${esc(state.wallFinish)} walls · ${esc(state.windowMaterial)} frames · ${esc(state.roofMaterial)} roof</p><p class="material-note">Interior direction: ${esc(state.interior)} with ${esc(state.furniture.toLowerCase())} furniture.</p></div><div class="insight-box"><span class="insight-symbol">✦</span><div><b>Finishes shape the feeling</b><br />These choices appear in your material notes and influence the surfaces and colors shown in both views.</div></div></div></div>`;
  }
  function xml(t){return esc(t);}
  function vastuNotes(){
    const face=state.facing, notes=[];
    notes.push({icon:"☀",title:"Light & entry",text:`With a ${face.toLowerCase()}-facing home, consider keeping the main entry welcoming and uncluttered. Where site conditions allow, an east or north-side entry is traditionally preferred.`});
    notes.push({icon:"⌂",title:"Shared living",text:"A living or family space toward the north or east can make good use of softer daylight. Keep the circulation path from the entry clear."});
    notes.push({icon:"◒",title:"Kitchen & rest",text:`A south-east kitchen is a common Vastu convention; a primary bedroom in the south-west is also traditionally recommended. Adapt these ideas to ventilation, structure and daily comfort.`});
    if(state.garden||Number(state.gardenArea)>0) notes.push({icon:"❋",title:"Garden & open space",text:"Your selected garden area is included in the plan. If practical, reserve lighter, open planting toward the north or east and keep dense trees away from the home's strongest daylight."});
    notes.push({icon:"✧",title:"A note on Vastu",text:"These are traditional, general design ideas based on your chosen facing and requested spaces—not astrology, an AI prediction, or a substitute for site-specific professional advice."});
    return notes;
  }
  // A deterministic, proportional room program. It is a concept diagram, not a construction drawing.
  function roomProgram(){
    const b=Math.max(1,Math.min(8,Number(state.bedrooms)||1)), baths=Math.max(1,Math.min(8,Number(state.bathrooms)||1));
    const names=["Living room","Kitchen",...Array.from({length:b},(_,i)=>`Bedroom ${i+1}`),...Array.from({length:baths},(_,i)=>`Bathroom ${i+1}`)];
    if(state.balcony)names.push("Balcony"); if(state.garden||Number(state.gardenArea)>0)names.push("Garden"); if(Number(state.parking)>0) names.push("Parking");
    const cols=4, rows=Math.ceil(names.length/cols), rooms=[];
    // Always reserve a legible 4xN grid; scale the plan's real-world footprint from requested area.
    for(let i=0;i<names.length;i++){
      const row=Math.floor(i/cols), col=i%cols;
      const w= i===names.length-1 && names.length%cols===1 ? 2 : 1;
      let type=names[i].startsWith("Bedroom")?"bedroom":names[i].startsWith("Bathroom")?"bath":names[i]==="Kitchen"?"kitchen":names[i]==="Balcony"?"balcony":names[i]==="Garden"?"garden":names[i]==="Parking"?"parking":names[i]==="Living room"?"living":"other";
      let roomArea=type==="living"?Math.round(Number(state.area)*.22):type==="bedroom"?Math.round(Number(state.area)*.12):type==="kitchen"?Math.round(Number(state.area)*.11):type==="bath"?Math.round(Number(state.area)*.045):type==="balcony"?Math.round(Number(state.area)*.045):type==="garden"?(Number(state.gardenArea)||Math.max(70,Math.round(Number(state.area)*.12))):type==="parking"?(Number(state.parkingArea)||Math.round(Number(state.area)*.1)):0;
      rooms.push({name:names[i],type,row,col,w,area:roomArea});
    }
    return {rooms,cols,rows};
  }
  function renderResult(){selectedFloor=Math.min(selectedFloor,Number(state.floors)||1);return `<div class="result-toolbar"><div class="result-tabs"><button data-view="2d" class="${view==="2d"?"active":""}">▦ &nbsp;2D floor plan</button><button data-view="3d" class="${view==="3d"?"active":""}">⬡ &nbsp;3D cutaway</button></div><select class="floor-select" id="floorSelect" aria-label="Select floor">${Array.from({length:Number(state.floors)||1},(_,i)=>`<option value="${i+1}" ${selectedFloor===i+1?"selected":""}>Floor ${i+1}${i===0?" · Ground":""}</option>`).join("")}</select><div class="result-actions"><button class="small-action" id="downloadSvg">↓ Save plan</button><button class="small-action" id="printPlan">⎙ Print</button></div></div><div class="visual-canvas" id="visualCanvas">${view==="2d"?make2d():make3d()}</div><div class="view-caption"><span>Concept layout · generated from your room list</span><span>▰ ${Number(state.area)||1500} ${state.unit} · ${Number(state.floors)||1} floor${Number(state.floors)===1?"":"s"}</span></div>
      <div class="result-summary">${[["HOME",state.name||state.location||"Your home"],["ROOMS",`${Number(state.bedrooms)||1} bed · ${Number(state.bathrooms)||1} bath`],["PAINT",palettes[state.palette]?.name||"Custom pairing"],["INTERIOR",state.interior]].map(([k,v])=>`<div class="summary-pill"><small>${k}</small><strong>${esc(v)}</strong></div>`).join("")}</div>
      <div class="below-grid"><div class="finish-card"><h4>Your material & interior notes</h4><div class="finish-line">Floor · ${esc(state.floorMaterial)}<br>Walls · ${esc(state.wallFinish)}<br>Roof · ${esc(state.roofMaterial)} · Frames · ${esc(state.windowMaterial)}<br>Interior · ${esc(state.interior)} · ${esc(state.furniture.toLowerCase())} furnishings</div></div><div class="finish-card"><h4>Vastu-inspired suggestions</h4><div class="finish-line">${vastuNotes().slice(0,3).map(n=>`<b>${n.title}:</b> ${n.text}`).join("<br>")}</div></div></div><div class="warning-note">Conceptual visualization only. Room areas and placements are illustrative; confirm dimensions, structure, building codes, ventilation and services with a qualified local architect before construction. Vastu notes reflect traditional beliefs and are not scientific or astrological predictions.</div>`;
  }
  function make2d(){
    const p=roomProgram(), W=800,H=Math.max(310,p.rows*125+62), pad=42, gap=6, cellW=(W-pad*2-gap*(p.cols-1))/p.cols, cellH=(H-pad*2-gap*(p.rows-1))/p.rows;
    const pal=palettes[state.palette]||palettes.linen;
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="2D concept floor plan"><rect width="100%" height="100%" fill="#f7f6f0"/><text x="${pad}" y="25" font-family="DM Sans, sans-serif" font-size="11" font-weight="700" fill="#607260">HEARTH · FLOOR ${selectedFloor}</text><text x="${W-pad}" y="25" text-anchor="end" font-family="DM Sans, sans-serif" font-size="9" fill="#969b91">${state.facing.toUpperCase()} FACING · ${Number(state.area)||1500} ${state.unit.toUpperCase()}</text>`;
    svg+=`<path d="M ${pad-13} ${pad+9} L ${pad-13} ${pad-17} L ${pad-18} ${pad-9} M ${pad-13} ${pad-17} L ${pad-8} ${pad-9}" fill="none" stroke="#728270" stroke-width="1.5"/><text x="${pad-13}" y="${pad-24}" text-anchor="middle" font-family="DM Sans" font-size="8" fill="#728270">N</text>`;
    p.rooms.forEach((r,i)=>{
      const x=pad+r.col*(cellW+gap), y=pad+r.row*(cellH+gap), w=cellW*r.w+gap*(r.w-1), h=cellH;
      const fill=r.type==="bath"?"#e2e8e3":r.type==="balcony"?"#d8e2d7":r.type==="garden"?"#dfe8d7":r.type==="parking"?"#e2e0db":r.type==="kitchen"?"#efe3d2":r.type==="bedroom"?pal.wall:r.type==="living"?state.wallColor:"#f3eadb";
      svg+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${fill}" stroke="#fffefa" stroke-width="5"/><rect x="${x+2}" y="${y+2}" width="${w-4}" height="${h-4}" rx="2" fill="none" stroke="#7c8077" stroke-width="2"/>`;
      svg+=`<text x="${x+w/2}" y="${y+27}" text-anchor="middle" font-family="Manrope, sans-serif" font-size="${w<140?9:11}" font-weight="700" fill="#49534a">${xml(r.name)}</text><text x="${x+w/2}" y="${y+42}" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="8" fill="#737c70">~${r.area} ${state.unit}</text>`;
      const fx=x+w*.3, fy=y+h*.53;
      if(r.type==="bedroom")svg+=`<rect x="${fx}" y="${fy}" width="${w*.4}" height="${h*.29}" rx="4" fill="#fffefa" stroke="#b2a38d"/><rect x="${fx+4}" y="${fy+4}" width="${w*.14}" height="${h*.07}" rx="2" fill="${state.accentColor}"/><rect x="${fx+w*.17}" y="${fy+4}" width="${w*.14}" height="${h*.07}" rx="2" fill="${state.accentColor}"/>`;
      else if(r.type==="living")svg+=`<rect x="${fx}" y="${fy}" width="${w*.35}" height="${h*.18}" rx="6" fill="#f9f5eb" stroke="#b5a792"/><rect x="${fx+w*.41}" y="${fy-7}" width="${w*.11}" height="${h*.35}" rx="3" fill="#d6c8ae"/><circle cx="${x+w*.77}" cy="${y+h*.68}" r="5" fill="#869a7a"/>`;
      else if(r.type==="kitchen")svg+=`<rect x="${x+13}" y="${y+h-26}" width="${w-26}" height="12" rx="3" fill="#c8b79f"/><circle cx="${x+w*.5}" cy="${y+h-20}" r="4" fill="#f2eee6"/><rect x="${x+w*.3}" y="${y+53}" width="${w*.4}" height="9" rx="4" fill="#b7a386"/>`;
      else if(r.type==="bath")svg+=`<rect x="${x+w*.28}" y="${y+h*.58}" width="${w*.42}" height="${h*.2}" rx="8" fill="#fffefa" stroke="#b6c4b8"/><circle cx="${x+w*.18}" cy="${y+h*.66}" r="7" fill="#fffefa" stroke="#a9b7ac"/>`;
      else if(r.type==="garden")svg+=`<circle cx="${x+w*.35}" cy="${y+h*.67}" r="7" fill="#859b75"/><circle cx="${x+w*.65}" cy="${y+h*.59}" r="9" fill="#9db18d"/><circle cx="${x+w*.79}" cy="${y+h*.75}" r="5" fill="#708d6a"/>`;
      else if(r.type==="balcony")svg+=`<line x1="${x+9}" y1="${y+h-16}" x2="${x+w-9}" y2="${y+h-16}" stroke="#859585" stroke-width="2"/><circle cx="${x+w*.23}" cy="${y+h*.72}" r="6" fill="#879c7d"/>`;
      else if(r.type==="parking")svg+=`<rect x="${x+w*.32}" y="${y+h*.56}" width="${w*.4}" height="${h*.26}" rx="8" fill="#bdc1bd" stroke="#959c97"/><circle cx="${x+w*.4}" cy="${y+h*.82}" r="3" fill="#59635c"/><circle cx="${x+w*.64}" cy="${y+h*.82}" r="3" fill="#59635c"/>`;
      // Small door swing arc keeps the plan architectural without implying exact construction dimensions.
      const dx=x+w*.5; svg+=`<path d="M ${dx} ${y+h-3} v -13 a 13 13 0 0 1 13 13" fill="none" stroke="#9e8d75" stroke-width="1"/>`;
    });
    svg+=`<text x="${pad}" y="${H-10}" font-family="DM Sans" font-size="8" fill="#9b9e93">N ↑  ·  Room areas are indicative. Layout adapts to requested spaces.</text></svg>`; return svg;
  }
  function make3d(){
    const p=roomProgram(), cols=p.cols, rows=p.rows, s=80, ox=400, oy=55, pal=palettes[state.palette]||palettes.linen; let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 470" role="img" aria-label="3D isometric cutaway home visualization"><defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#f6f6f0"/><stop offset="1" stop-color="#eeeee6"/></linearGradient><filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="7" stdDeviation="8" flood-color="#465349" flood-opacity=".12"/></filter></defs><rect width="800" height="470" fill="url(#bg)"/><text x="30" y="32" font-family="DM Sans" font-size="10" font-weight="700" fill="#697b68">HEARTH · ISOMETRIC CUTAWAY</text><text x="770" y="32" text-anchor="end" font-family="DM Sans" font-size="9" fill="#93998e">FLOOR ${selectedFloor} · ${state.interior.toUpperCase()}</text><g filter="url(#shadow)">`;
    const vx=s*.86, vy=s*.5, wallH=47, center=(cols-rows)*vx/2;
    const pt=(x,y,z=0)=>[ox+center+(x-y)*vx,oy+(x+y)*vy-z];
    // floor plane
    let A=pt(0,0),B=pt(cols,0),C=pt(cols,rows),D=pt(0,rows);
    svg+=`<polygon points="${[A,B,C,D].map(a=>a.join(",")).join(" ")}" fill="#d9d1c2" stroke="#716f67" stroke-width="2"/>`;
    p.rooms.forEach(r=>{
      const x=r.col,y=r.row,w=r.w,h=1; const a=pt(x,y),b=pt(x+w,y),c=pt(x+w,y+h),d=pt(x,y+h);
      const floor=r.type==="bath"?"#cfd9d4":r.type==="garden"?"#c4d0b5":r.type==="balcony"?"#d3d8ca":r.type==="kitchen"?"#dcccad":r.type==="living"?pal.floor:r.type==="bedroom"?"#d8c4a7":"#d4c6ad";
      svg+=`<polygon points="${[a,b,c,d].map(q=>q.join(",")).join(" ")}" fill="${floor}" stroke="#f9f7ef" stroke-width="2"/>`;
      const label=pt(x+w/2,y+h/2,-3);svg+=`<text x="${label[0]}" y="${label[1]}" text-anchor="middle" font-family="DM Sans" font-size="${w>1?8:7}" font-weight="700" fill="#566156">${xml(r.name)}</text>`;
      const furn=pt(x+w/2,y+h/2,1);
      if(r.type==="bedroom"){svg+=`<polygon points="${furn[0]-18},${furn[1]-3} ${furn[0]+13},${furn[1]-3} ${furn[0]+13},${furn[1]-12} ${furn[0]-18},${furn[1]-12}" fill="#f7f2e8" stroke="#a99678"/><polygon points="${furn[0]-14},${furn[1]-4} ${furn[0]-5},${furn[1]-4} ${furn[0]-5},${furn[1]-10} ${furn[0]-14},${furn[1]-10}" fill="${state.accentColor}"/>`;}
      if(r.type==="living"){svg+=`<polygon points="${furn[0]-19},${furn[1]-2} ${furn[0]+6},${furn[1]-2} ${furn[0]+6},${furn[1]-10} ${furn[0]-19},${furn[1]-10}" fill="#f4eee2" stroke="#aa987f"/><polygon points="${furn[0]+11},${furn[1]-2} ${furn[0]+19},${furn[1]-2} ${furn[0]+19},${furn[1]-15} ${furn[0]+11},${furn[1]-15}" fill="#b99b78"/>`;}
      if(r.type==="kitchen"){svg+=`<polygon points="${furn[0]-19},${furn[1]+7} ${furn[0]+19},${furn[1]+7} ${furn[0]+19},${furn[1]+2} ${furn[0]-19},${furn[1]+2}" fill="#9b8161"/>`;}
    });
    // low outer walls with light top face. Roof remains open to show furniture and partitions.
    const wall=(p1,p2)=>{const p3=[p2[0],p2[1]-wallH],p4=[p1[0],p1[1]-wallH];return `<polygon points="${[p1,p2,p3,p4].map(q=>q.join(",")).join(" ")}" fill="${state.wallColor}" stroke="#d5d1c6" stroke-width="1.3"/><polyline points="${p4.join(",")} ${p3.join(",")}" fill="none" stroke="${pal.trim}" stroke-width="3"/>`;};
    svg+=wall(A,D)+wall(D,C)+wall(C,B)+wall(B,A);
    // half-height interior partitions keep the axonometric model readable.
    for(let x=1;x<cols;x++) { const p1=pt(x,0),p2=pt(x,rows); svg+=`<line x1="${p1[0]}" y1="${p1[1]-wallH*.48}" x2="${p2[0]}" y2="${p2[1]-wallH*.48}" stroke="#ddd8cb" stroke-width="5"/>`; }
    for(let y=1;y<rows;y++){const p1=pt(0,y),p2=pt(cols,y);svg+=`<line x1="${p1[0]}" y1="${p1[1]-wallH*.48}" x2="${p2[0]}" y2="${p2[1]-wallH*.48}" stroke="#ddd8cb" stroke-width="5"/>`;}
    svg+=`</g><g transform="translate(31 415)"><rect width="738" height="34" rx="8" fill="#fffefa" stroke="#e8e7df"/><circle cx="16" cy="17" r="5" fill="${state.wallColor}"/><text x="27" y="20" font-family="DM Sans" font-size="8" fill="#7b8178">${esc(state.palette in palettes?palettes[state.palette].name:"Custom palette")} · ${esc(state.floorMaterial)} · ${esc(state.wallFinish)} · ${esc(state.windowMaterial)} frames · ${esc(state.interior)} · ${esc(state.furniture)} furniture · Roof off to show rooms</text></g></svg>`;
    return svg;
  }
  function bindFields(){
    $$("[data-key]").forEach(el=>{
      const update=()=>{
        let val=el.type==="radio"?(el.checked?(el.type==="radio"&&(el.name==="balcony"||el.name==="garden")?el.value==="true":el.value):state[el.dataset.key]):el.value;
        if(el.type==="radio"&&!el.checked)return;
        if(["area","floors","bedrooms","bathrooms","parking","gardenArea","parkingArea"].includes(el.dataset.key))val=Number(val);
        state[el.dataset.key]=val;
        if(el.dataset.key==="palette"){const p=palettes[val];state.wallColor=p.wall;state.accentColor=p.accent;}
        if(el.dataset.key==="unit"&&val!==state.unit){const factor=val==="sq m"?1/10.7639:10.7639;for(const key of ["area","gardenArea","parkingArea"])if(Number(state[key])>0)state[key]=Math.round(Number(state[key])*factor);state.unit=val;}
        save();
        if(state.step===1){const p=palettes[state.palette]||{};$("#previewHouse").style.setProperty("--preview-wall",state.wallColor);$("#previewHouse").style.setProperty("--preview-roof",p.roof||"#718171");$("#previewName").textContent=`${p.name||"Custom colors"} · main walls and a thoughtful accent`;$$("#previewHouse");$("#paletteDescription").textContent=p.description||"Your own color pairing";$("[data-key=wallColor]").value=state.wallColor;$("[data-key=accentColor]").value=state.accentColor;}
        if(state.step===2||(state.step===0&&el.dataset.key==="unit")){const focus=el.dataset.key;render();const again=$(`[data-key="${focus}"][value="${CSS.escape(String(val))}"]`)||$(`[data-key="${focus}"]`);if(again)again.focus();}
      };
      el.addEventListener("change",update); if(el.type==="color")el.addEventListener("input",update);
    });
  }
  function bindResult(){
    $$('[data-view]').forEach(b=>b.addEventListener("click",()=>{view=b.dataset.view;render();}));
    $("#floorSelect").addEventListener("change",e=>{selectedFloor=Number(e.target.value);$("#visualCanvas").innerHTML=view==="2d"?make2d():make3d();});
    $("#downloadSvg").addEventListener("click",()=>{const svg=$("#visualCanvas svg").outerHTML;const blob=new Blob([svg],{type:"image/svg+xml"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`hearth-${view}-floor-${selectedFloor}.svg`;a.click();URL.revokeObjectURL(a.href);});
    $("#printPlan").addEventListener("click",()=>window.print());
  }
  function goStep(n){state.step=Math.max(0,Math.min(steps.length-1,n));save();render();$(".workspace").scrollIntoView({behavior:"smooth",block:"start"});}
  $("#nextButton").addEventListener("click",()=>{if(state.step===steps.length-1){goStep(2);return;} if(state.step===0&&!validBasics())return;goStep(state.step+1);});
  $("#backButton").addEventListener("click",()=>goStep(state.step===3?2:state.step-1));
  function validBasics(){const a=Number(state.area), b=Number(state.bedrooms), f=Number(state.floors);if(!Number.isFinite(a)||a<250||a>100000){alert("Please enter a home area between 250 and 100,000.");return false;}if(!Number.isFinite(b)||b<1||b>8){alert("Choose between 1 and 8 bedrooms for this concept planner.");return false;}if(!Number.isFinite(f)||f<1||f>5){alert("Choose between 1 and 5 floors.");return false;}return true;}
  const dialog=$("#resetDialog");$("#resetProject").addEventListener("click",()=>dialog.showModal());$("#cancelReset").addEventListener("click",()=>dialog.close());$("#confirmReset").addEventListener("click",()=>{localStorage.removeItem("hearth-home");state={...stateDefaults};view="2d";selectedFloor=1;dialog.close();render();window.scrollTo({top:0,behavior:"smooth"});});
  render();
})();
