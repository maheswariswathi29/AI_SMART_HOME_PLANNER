(() => {
  const data = window.HOME_PLAN || {home:{},rooms:[]};
  const home = data.home, rooms = data.rooms;
  const palette = {
    linen:{floor:"#d6bd98",roof:"#798575"},coastal:{floor:"#cdbb9e",roof:"#687e7c"},
    clay:{floor:"#ad8a68",roof:"#706c55"},dusk:{floor:"#9f9588",roof:"#505963"},
    garden:{floor:"#c8b391",roof:"#566e57"},blush:{floor:"#987557",roof:"#6c5b55"}
  };
  const xml = value => String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]));
  const unitArea = value => home.area_unit === "sq m" ? `${Math.round(Number(value||0)/10.7639)} sq m` : `${Number(value||0).toLocaleString()} sq ft`;
  const furnitureColor = home.interior_style === "Indian modern" ? "#ad7657" : home.interior_style === "Scandinavian" ? "#c9b899" : home.interior_style === "Evening dusk" ? "#777f88" : "#b99b78";
  let activePanel = 0;
  let floor2d = 1;
  let floor3d = 1;
  let orbit = 0;
  let tilt = 0;
  let zoom = 1;
  let spinTimer = null;

  // Keep shared bathrooms beside the living zone and ensuites beside their
  // bedrooms, while fitting every row to the full plan width.
  function layoutFloor(floor) {
    const selected=rooms.filter(room=>Number(room.floor||1)===Number(floor));
    if(!selected.length)return [];
    const living=selected.find(room=>room.name==="Living room");
    const kitchen=selected.find(room=>room.type==="kitchen");
    const common=selected.filter(room=>room.type==="bath"&&(room.bath_role==="common"||room.attached_to==="Living room"));
    const used=new Set([...common,...(living?[living]:[]),...(kitchen?[kitchen]:[])]);
    const groups=[];
    const social=[living,...common,kitchen].filter(Boolean);
    if(social.length)groups.push(social);
    selected.filter(room=>room.type==="bedroom").forEach(bedroom=>{
      const ensuite=selected.find(room=>room.type==="bath"&&room.attached_to===bedroom.name);
      groups.push([bedroom,...(ensuite?[ensuite]:[])]);
      used.add(bedroom);if(ensuite)used.add(ensuite);
    });
    selected.filter(room=>!used.has(room)).forEach(room=>groups.push([room]));
    const rowGroups=[];let row=[];
    groups.forEach(group=>{
      if(row.length&&row.length+group.length>4){rowGroups.push(row);row=[];}
      for(let i=0;i<group.length;i+=4){
        const part=group.slice(i,i+4);
        if(row.length&&row.length+part.length>4){rowGroups.push(row);row=[];}
        row.push(...part);
        if(row.length===4){rowGroups.push(row);row=[];}
      }
    });
    if(row.length)rowGroups.push(row);
    const placed=[];
    rowGroups.forEach((roomsInRow,rowIndex)=>{
      const span=4/roomsInRow.length;
      roomsInRow.forEach((room,slot)=>placed.push({...room,layoutSlot:slot,layoutX:slot*span,layoutY:rowIndex,layoutSpan:span,rowCount:roomsInRow.length}));
    });
    return placed;
  }

  function render2d(floor) {
    const levelRooms=layoutFloor(floor);
    const width=800, pad=38, gap=6, rows=levelRooms.length?Math.max(...levelRooms.map(room=>room.layoutY))+1:1, cellH=115;
    const height=pad*2+rows*cellH+(rows-1)*gap+28;
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="2D concept floor plan"><rect width="100%" height="100%" fill="#f7f6f0"/><text x="${pad}" y="23" font-family="DM Sans,sans-serif" font-size="11" font-weight="700" fill="#607260">${xml(home.name||"NIVASA HOME")} · FLOOR ${floor}</text><text x="${width-pad}" y="23" text-anchor="end" font-family="DM Sans,sans-serif" font-size="9" fill="#969b91">${xml(home.facing).toUpperCase()} FACING · ${unitArea(home.area_sqft)}</text><path d="M ${pad-13} ${pad+8} L ${pad-13} ${pad-17} L ${pad-18} ${pad-9} M ${pad-13} ${pad-17} L ${pad-8} ${pad-9}" fill="none" stroke="#728270" stroke-width="1.5"/><text x="${pad-13}" y="${pad-24}" text-anchor="middle" font-family="DM Sans" font-size="8" fill="#728270">N</text>`;
    const colors={living:home.wall_color||"#eee5d3",bedroom:home.wall_color||"#eee5d3",kitchen:"#eee3d1",bath:"#e2e8e3",balcony:"#d8e2d7",garden:"#dfe8d7",parking:"#e2e0db"};
    levelRooms.forEach((room,index)=>{
      const row=room.layoutY,rowWidth=width-pad*2,gapWidth=gap*(room.rowCount-1),cellW=(rowWidth-gapWidth)/room.rowCount;
      const x=pad+room.layoutSlot*(cellW+gap),y=pad+row*(cellH+gap),w=cellW,h=cellH;
      svg+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${colors[room.type]||"#f2eadc"}" stroke="#fffefa" stroke-width="5"/><rect x="${x+2}" y="${y+2}" width="${w-4}" height="${h-4}" rx="2" fill="none" stroke="#7c8077" stroke-width="2"/>`;
      svg+=`<text x="${x+w/2}" y="${y+25}" text-anchor="middle" font-family="Manrope,sans-serif" font-size="${w<145?10:12}" font-weight="700" fill="#49534a">${xml(room.name)}</text><text x="${x+w/2}" y="${y+40}" text-anchor="middle" font-family="DM Sans,sans-serif" font-size="8" fill="#737c70">~${unitArea(room.area)}</text>`;
      const fx=x+w*.30, fy=y+h*.56;
      if(room.type==="bedroom")svg+=`<rect x="${fx}" y="${fy}" width="${w*.4}" height="${h*.28}" rx="4" fill="#fffefa" stroke="#b2a38d"/><rect x="${fx+4}" y="${fy+4}" width="${w*.13}" height="${h*.07}" rx="2" fill="${home.accent_color}"/><rect x="${fx+w*.17}" y="${fy+4}" width="${w*.13}" height="${h*.07}" rx="2" fill="${home.accent_color}"/>`;
      else if(room.type==="living")svg+=`<rect x="${fx}" y="${fy}" width="${w*.35}" height="${h*.17}" rx="6" fill="#f9f5eb" stroke="#b5a792"/><rect x="${fx+w*.42}" y="${fy-6}" width="${w*.11}" height="${h*.32}" rx="3" fill="${furnitureColor}"/><circle cx="${x+w*.77}" cy="${y+h*.71}" r="5" fill="#869a7a"/>`;
      else if(room.type==="kitchen")svg+=`<rect x="${x+12}" y="${y+h-24}" width="${w-24}" height="11" rx="3" fill="#c8b79f"/><circle cx="${x+w*.5}" cy="${y+h-18}" r="4" fill="#f2eee6"/><rect x="${x+w*.3}" y="${y+53}" width="${w*.4}" height="8" rx="4" fill="#b7a386"/>`;
      else if(room.type==="bath")svg+=`<rect x="${x+w*.28}" y="${y+h*.60}" width="${w*.42}" height="${h*.18}" rx="8" fill="#fffefa" stroke="#b6c4b8"/><circle cx="${x+w*.18}" cy="${y+h*.68}" r="7" fill="#fffefa" stroke="#a9b7ac"/>`;
      else if(room.type==="garden")svg+=`<circle cx="${x+w*.35}" cy="${y+h*.69}" r="7" fill="#859b75"/><circle cx="${x+w*.65}" cy="${y+h*.61}" r="9" fill="#9db18d"/><circle cx="${x+w*.79}" cy="${y+h*.76}" r="5" fill="#708d6a"/>`;
      else if(room.type==="balcony")svg+=`<line x1="${x+9}" y1="${y+h-15}" x2="${x+w-9}" y2="${y+h-15}" stroke="#859585" stroke-width="2"/><circle cx="${x+w*.23}" cy="${y+h*.72}" r="6" fill="#879c7d"/>`;
      else if(room.type==="parking")svg+=`<rect x="${x+w*.32}" y="${y+h*.57}" width="${w*.4}" height="${h*.25}" rx="8" fill="#bdc1bd" stroke="#959c97"/><circle cx="${x+w*.4}" cy="${y+h*.82}" r="3" fill="#59635c"/><circle cx="${x+w*.64}" cy="${y+h*.82}" r="3" fill="#59635c"/>`;
      svg+=`<path d="M ${x+w*.5} ${y+h-3} v -13 a 13 13 0 0 1 13 13" fill="none" stroke="#9e8d75" stroke-width="1"/>`;
    });
    svg+=`<text x="${pad}" y="${height-10}" font-family="DM Sans,sans-serif" font-size="8" fill="#9b9e93">N ↑ · Illustrative room sizes · ${xml(home.floor_material)} floor · ${xml(home.wall_finish)} walls</text></svg>`;
    return svg;
  }

  function render3d(floor) {
    const levelRooms=layoutFloor(floor);
    const cols=4,rows=levelRooms.length?Math.max(...levelRooms.map(room=>room.layoutY))+1:1;
    const areaScale=.84+.32*Math.max(0,Math.min(1,(Number(home.area_sqft||1500)-800)/1700));
    const s=Math.min(110,400/(.5*(cols+rows)+.8))*areaScale*zoom,ox=400,oy=250,vx=s*.86,vy=s*.5,wallH=55*zoom;
    const cosYaw=Math.cos(orbit),sinYaw=Math.sin(orbit);
    const pt=(x,y,z=0)=>{const rx=(x-cols/2)*cosYaw-(y-rows/2)*sinYaw, ry=(x-cols/2)*sinYaw+(y-rows/2)*cosYaw;return [ox+(rx-ry)*vx,oy+(rx+ry)*vy-z*Math.cos(tilt)];};
    const pointList=arr=>arr.map(p=>`${p[0]},${p[1]}`).join(" ");
    const p=palette[home.palette_id]||palette.linen;
    const timber=home.window_material==="Timber"?"#8a533b":home.window_material==="uPVC"?"#f9faf4":"#526c75";
    const floorPattern=home.floor_material==="Wood-look plank"?"url(#woodFloor)":home.floor_material==="Natural stone"?"url(#stoneFloor)":home.floor_material==="Polished concrete"?"url(#smoothFloor)":"url(#tileFloor)";
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" role="img" aria-label="Interactive isometric 3D house cutaway. Drag to rotate; use the wheel to zoom."><defs>
      <linearGradient id="viewBg" x2="0" y2="1"><stop stop-color="#f2ebff"/><stop offset=".58" stop-color="#fff9f0"/><stop offset="1" stop-color="#e7f3ef"/></linearGradient>
      <linearGradient id="wallFace" x2="1" y2="1"><stop stop-color="#fffefa"/><stop offset="1" stop-color="${home.wall_color}"/></linearGradient>
      <linearGradient id="sideFace" x2="0" y2="1"><stop stop-color="#e8dfd8"/><stop offset="1" stop-color="#d7cfc7"/></linearGradient>
      <linearGradient id="slabTop" x2="1" y2="1"><stop stop-color="#fffefa"/><stop offset="1" stop-color="#e7dfd6"/></linearGradient>
      <pattern id="tileFloor" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#f2e8d8"/><path d="M18 0H0V18" fill="none" stroke="#ddcfbd" stroke-width=".65"/></pattern>
      <pattern id="woodFloor" width="28" height="15" patternUnits="userSpaceOnUse"><rect width="28" height="15" fill="#d9b78f"/><path d="M0 0H28M0 7.5H28M14 0V7.5M5 7.5V15" fill="none" stroke="#b88e67" stroke-width=".8"/></pattern>
      <pattern id="stoneFloor" width="24" height="18" patternUnits="userSpaceOnUse"><rect width="24" height="18" fill="#d6d5ce"/><path d="M24 0H0V18M12 0V9M0 9H24" fill="none" stroke="#b9b8b1" stroke-width=".8"/></pattern>
      <pattern id="smoothFloor" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#dddcd6"/><circle cx="5" cy="6" r=".6" fill="#c6c4bd"/><circle cx="17" cy="16" r=".6" fill="#c6c4bd"/></pattern>
      <filter id="modelShadow" x="-30%" y="-20%" width="160%" height="165%"><feDropShadow dx="0" dy="13" stdDeviation="11" flood-color="#493574" flood-opacity=".24"/></filter>
      <filter id="furnShadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="1" dy="3" stdDeviation="2" flood-color="#4d3c37" flood-opacity=".22"/></filter>
    </defs><rect width="800" height="520" fill="url(#viewBg)"/><circle cx="694" cy="101" r="43" fill="#ffd29b" opacity=".26"/><text x="28" y="31" font-family="DM Sans,sans-serif" font-size="10" font-weight="800" letter-spacing="1.2" fill="#694bb0">NIVASA · HOME PREVIEW</text><text x="770" y="31" text-anchor="end" font-family="DM Sans,sans-serif" font-size="9" font-weight="700" fill="#80748e">LEVEL ${floor} · ${xml(home.interior_style).toUpperCase()}</text><g filter="url(#modelShadow)">`;
    const a=pt(0,0),b=pt(cols,0),c=pt(cols,rows),d=pt(0,rows);
    const down=(point,amount)=>[point[0],point[1]+amount];
    svg+=`<polygon points="${pointList([d,c,down(c,13),down(d,13)])}" fill="url(#sideFace)" stroke="#fffefa" stroke-width="2"/><polygon points="${pointList([a,d,down(d,13),down(a,13)])}" fill="#cfc6bd" stroke="#fffefa" stroke-width="2"/><polygon points="${pointList([a,b,c,d])}" fill="url(#slabTop)" stroke="#ffffff" stroke-width="4"/>`;
    const floors={living:"#f0e7fa",bedroom:"#f8edf0",kitchen:"#fff0d8",bath:"#dff0f0",balcony:"#d9ecdf",garden:"#d9edce",parking:"#e8e6ed"};
    const elevated=(x,y,z)=>pt(x,y,z);
    const bedFor=(room,x,y,span)=>{
      const left=x+.3,right=x+span-.3,top=y+.24,bottom=y+.77;
      svg+=`<polygon points="${pointList([pt(left-.08,top-.04,1),pt(right+.08,top-.04,1),pt(right+.08,bottom+.05,1),pt(left-.08,bottom+.05,1)])}" fill="${home.accent_color}" opacity=".46"/>`;
      svg+=`<polygon points="${pointList([elevated(left,top,2),elevated(right,top,2),elevated(right,bottom,2),elevated(left,bottom,2)])}" fill="#fffdf8" stroke="#a89072" stroke-width="1.5"/>`;
      svg+=`<polygon points="${pointList([elevated(left+.04,top+.04,3),elevated(left+.25,top+.04,3),elevated(left+.25,top+.17,3),elevated(left+.04,top+.17,3)])}" fill="${home.accent_color}"/><path d="M${pt(left,top+.26)[0]} ${pt(left,top+.26)[1]} L${pt(right,top+.26)[0]} ${pt(right,top+.26)[1]}" stroke="#e6d8cc" stroke-width="1"/>`;
      // Matching nightstands with lamps, a wardrobe and a soft bedside rug.
      [[x+.08,top+.02],[x+span-.2,top+.02]].forEach(([nx,ny])=>{
        const table=[pt(nx,ny,2),pt(nx+.12,ny,2),pt(nx+.12,ny+.14,2),pt(nx,ny+.14,2)];
        const lamp=pt(nx+.06,ny+.07,7);
        svg+=`<polygon points="${pointList(table)}" fill="#9d7053" stroke="#fff8ed" stroke-width="1"/><path d="M${pt(nx+.06,ny+.07,3)[0]} ${pt(nx+.06,ny+.07,3)[1]}L${lamp[0]} ${lamp[1]}" stroke="#8c765d" stroke-width="1.2"/><circle cx="${lamp[0]}" cy="${lamp[1]}" r="3" fill="#f3d78f"/>`;
      });
      const wardrobe=[pt(x+.08,y+.55,1),pt(x+.2,y+.55,1),pt(x+.2,y+.88,1),pt(x+.08,y+.88,1)];
      svg+=`<polygon points="${pointList(wardrobe)}" fill="#8b5e46" stroke="#f8efe5" stroke-width="1.2"/><path d="M${pt(x+.14,y+.58,1)[0]} ${pt(x+.14,y+.58,1)[1]}L${pt(x+.14,y+.84,1)[0]} ${pt(x+.14,y+.84,1)[1]}" stroke="#d7b394" stroke-width="1"/>`;
    };
    const plant=(x,y)=>{const q=pt(x,y);svg+=`<ellipse cx="${q[0]}" cy="${q[1]}" rx="5" ry="2.5" fill="#b76e58"/><path d="M${q[0]} ${q[1]-2}v-8m0 5-5-5m5 3 5-6m-5 10 6-3" fill="none" stroke="#568b65" stroke-width="1.5" stroke-linecap="round"/><circle cx="${q[0]-5}" cy="${q[1]-10}" r="2.6" fill="#77a878"/><circle cx="${q[0]+5}" cy="${q[1]-10}" r="2.8" fill="#8bb987"/><circle cx="${q[0]}" cy="${q[1]-14}" r="3" fill="#62966e"/>`};
    levelRooms.forEach((room,index)=>{
      const span=room.layoutSpan,x=room.layoutX,y=room.layoutY;
      const q=[pt(x,y),pt(x+span,y),pt(x+span,y+1),pt(x,y+1)];
      svg+=`<polygon points="${pointList(q)}" fill="${floors[room.type]||"#f1e8da"}" stroke="#fffefa" stroke-width="2.5"/><polygon points="${pointList(q)}" fill="${floorPattern}" opacity=".48" pointer-events="none"/>`;
      const centerPt=pt(x+span/2,y+.5,-3);
      if(room.type==="bedroom")bedFor(room,x,y,span);
      if(room.type==="living"){
        svg+=`<polygon points="${pointList([pt(x+.2,y+.52),pt(x+Math.min(span-.15,.82),y+.52),pt(x+Math.min(span-.15,.82),y+.86),pt(x+.2,y+.86)])}" fill="${home.accent_color}" opacity=".45" stroke="#ffffff" stroke-width="1"/>`;
        const sofa=[pt(x+.25,y+.57,2),pt(x+Math.min(span-.22,.75),y+.57,2),pt(x+Math.min(span-.22,.75),y+.71,2),pt(x+.25,y+.71,2)];
        svg+=`<g filter="url(#furnShadow)"><polygon points="${pointList(sofa)}" fill="#fffaf4" stroke="#9b8a91" stroke-width="1.4"/><path d="M${sofa[0][0]} ${sofa[0][1]-4}L${sofa[1][0]} ${sofa[1][1]-4}" stroke="${home.accent_color}" stroke-width="3" stroke-linecap="round"/><polygon points="${pointList([pt(x+.51,y+.78,2),pt(x+.7,y+.78,2),pt(x+.7,y+.89,2),pt(x+.51,y+.89,2)])}" fill="#b77d5f"/></g>`;
        // Coffee table, rug, media console and greenery finish the lounge.
        const coffee=[pt(x+.38,y+.34,2),pt(x+.62,y+.34,2),pt(x+.62,y+.47,2),pt(x+.38,y+.47,2)];
        const media=[pt(x+.12,y+.17,2),pt(x+.42,y+.17,2),pt(x+.42,y+.23,2),pt(x+.12,y+.23,2)];
        svg+=`<polygon points="${pointList(coffee)}" fill="#c28b62" stroke="#fff8ee" stroke-width="1.2"/><circle cx="${pt(x+.48,y+.39)[0]}" cy="${pt(x+.48,y+.39)[1]-3}" r="2.5" fill="#e6d8bd"/><polygon points="${pointList(media)}" fill="#76513f" stroke="#fff8ed" stroke-width="1"/><path d="M${pt(x+.19,y+.17)[0]} ${pt(x+.19,y+.17)[1]-5}L${pt(x+.36,y+.17)[0]} ${pt(x+.36,y+.17)[1]-5}" stroke="#253641" stroke-width="3"/>`;
        plant(x+span-.22,y+.25);
      }
      if(room.type==="kitchen"){
        svg+=`<polygon points="${pointList([pt(x+.12,y+.15,2),pt(x+span-.12,y+.15,2),pt(x+span-.12,y+.3,2),pt(x+.12,y+.3,2)])}" fill="#c89168" stroke="#fff8ec" stroke-width="1.5"/><polygon points="${pointList([pt(x+.12,y+.15,4),pt(x+.45,y+.15,4),pt(x+.45,y+.58,4),pt(x+.12,y+.58,4)])}" fill="#b77b59" stroke="#fff8ec" stroke-width="1.3"/><circle cx="${pt(x+.29,y+.36)[0]}" cy="${pt(x+.29,y+.36)[1]-4}" r="4" fill="#f3d58e"/><circle cx="${pt(x+.36,y+.36)[0]}" cy="${pt(x+.36,y+.36)[1]-4}" r="4" fill="#f3d58e"/>`;
        const island=[pt(x+.55,y+.48,2),pt(x+span-.12,y+.48,2),pt(x+span-.12,y+.63,2),pt(x+.55,y+.63,2)];
        svg+=`<polygon points="${pointList(island)}" fill="#f2e5d3" stroke="#aa8567" stroke-width="1.5"/>`;
        [x+.66,x+span-.3].forEach(sx=>{const seat=[pt(sx,y+.72,1),pt(sx+.09,y+.72,1),pt(sx+.09,y+.81,1),pt(sx,y+.81,1)];svg+=`<polygon points="${pointList(seat)}" fill="#8b6652" stroke="#f7efe5" stroke-width="1"/>`;});
      }
      if(room.type==="bath"){
        svg+=`<polygon points="${pointList([pt(x+.2,y+.23,1),pt(x+.76,y+.23,1),pt(x+.76,y+.62,1),pt(x+.2,y+.62,1)])}" fill="#fbffff" stroke="#8ebcc0" stroke-width="1.5"/><ellipse cx="${pt(x+.48,y+.42)[0]}" cy="${pt(x+.48,y+.42)[1]-2}" rx="9" ry="4" fill="#d7eff0" stroke="#8ebcc0"/>`;
        const vanity=[pt(x+.08,y+.18,2),pt(x+.22,y+.18,2),pt(x+.22,y+.4,2),pt(x+.08,y+.4,2)], toilet=pt(x+.79,y+.72,2);
        svg+=`<polygon points="${pointList(vanity)}" fill="#eee9df" stroke="#9baba9" stroke-width="1"/><ellipse cx="${toilet[0]}" cy="${toilet[1]-3}" rx="5" ry="3.5" fill="#fff" stroke="#aab8b6" stroke-width="1"/><path d="M${pt(x+.5,y+.2)[0]} ${pt(x+.5,y+.2)[1]-9}v8" stroke="#79aeb1" stroke-width="1.4"/>`;
      }
      if(room.type==="garden"){plant(x+.3,y+.42);plant(x+.72,y+.72);plant(x+.72,y+.25);}
      if(room.type==="balcony"){plant(x+.25,y+.36);plant(x+span-.24,y+.72);svg+=`<path d="M${pt(x+.1,y+.92)[0]} ${pt(x+.1,y+.92)[1]}L${pt(x+span-.1,y+.92)[0]} ${pt(x+span-.1,y+.92)[1]}" stroke="#77564b" stroke-width="2.5"/>`;[[x+.38,y+.4],[x+.63,y+.62]].forEach(([cx,cy])=>{const chair=[pt(cx,cy,1),pt(cx+.12,cy,1),pt(cx+.12,cy+.12,1),pt(cx,cy+.12,1)];svg+=`<polygon points="${pointList(chair)}" fill="#b78764" stroke="#fff7ed" stroke-width="1"/>`;});}
      if(room.type==="parking"){
        const car=[pt(x+.24,y+.28,2),pt(x+.73,y+.28,2),pt(x+.73,y+.68,2),pt(x+.24,y+.68,2)];
        svg+=`<polygon points="${pointList(car)}" fill="#8e9baa" stroke="#fff" stroke-width="1.5"/><polygon points="${pointList([pt(x+.32,y+.34,3),pt(x+.65,y+.34,3),pt(x+.65,y+.51,3),pt(x+.32,y+.51,3)])}" fill="#d4eff0"/><circle cx="${pt(x+.3,y+.34)[0]}" cy="${pt(x+.3,y+.34)[1]}" r="2.5" fill="#384252"/><circle cx="${pt(x+.68,y+.62)[0]}" cy="${pt(x+.68,y+.62)[1]}" r="2.5" fill="#384252"/>`;
      }
      svg+=`<rect x="${centerPt[0]-52}" y="${centerPt[1]-13}" width="104" height="17" rx="8.5" fill="#fffdf9" fill-opacity=".9" stroke="#ece3da"/><text x="${centerPt[0]}" y="${centerPt[1]-1}" text-anchor="middle" font-family="DM Sans,sans-serif" font-size="9.5" font-weight="800" letter-spacing=".25" fill="#57476c">${xml(room.name).toUpperCase()}</text>`;
    });
    const wall=(p1,p2,gradient="wallFace",windowOn=true)=>{
      const p3=[p2[0],p2[1]-wallH],p4=[p1[0],p1[1]-wallH];
      let face=`<polygon points="${pointList([p1,p2,p3,p4])}" fill="url(#${gradient})" stroke="#d8c9c0" stroke-width="1.5"/><path d="M${p4[0]} ${p4[1]}L${p3[0]} ${p3[1]}" stroke="#fffefa" stroke-width="4"/>`;
      if(windowOn){const at=(t,z)=>[p1[0]+(p2[0]-p1[0])*t,p1[1]+(p2[1]-p1[1])*t-z];const w=[at(.36,13),at(.64,13),at(.64,35),at(.36,35)];face+=`<polygon points="${pointList(w)}" fill="#b8e3e9" stroke="${timber}" stroke-width="3"/><path d="M${(w[0][0]+w[1][0])/2} ${(w[0][1]+w[1][1])/2}L${(w[3][0]+w[2][0])/2} ${(w[3][1]+w[2][1])/2}" stroke="${timber}" stroke-width="1.4"/><path d="M${w[0][0]} ${w[0][1]-2}L${w[1][0]} ${w[1][1]-2}" stroke="#fff" stroke-width="1.5"/>`;}
      return face;
    };
    svg+=wall(a,d,"wallFace")+wall(d,c,"sideFace");
    levelRooms.forEach(room=>{
      const boundary=room.layoutX+room.layoutSpan;
      if(boundary>=cols-.001)return;
      const partner=levelRooms.find(other=>other.layoutY===room.layoutY&&Math.abs(other.layoutX-boundary)<.001&&(other.attached_to===room.name||room.attached_to===other.name));
      const p1=pt(boundary,room.layoutY),p2=pt(boundary,room.layoutY+1),z=wallH*.48;
      let path="M"+p1[0]+" "+(p1[1]-z);
      if(partner){const gap1=pt(boundary,room.layoutY+.41),gap2=pt(boundary,room.layoutY+.6);path+="L"+gap1[0]+" "+(gap1[1]-z)+"M"+gap2[0]+" "+(gap2[1]-z);}
      path+="L"+p2[0]+" "+(p2[1]-z);
      svg+="<path d=\""+path+"\" stroke=\"#fffefa\" stroke-width=\"5\"/><path d=\""+path+"\" stroke=\"#c9b9ad\" stroke-width=\"1.4\"/>";
    });
    for(let y=1;y<rows;y++){const p1=pt(0,y),p2=pt(cols,y);svg+=`<path d="M${p1[0]} ${p1[1]-wallH*.48}L${p2[0]} ${p2[1]-wallH*.48}" stroke="#fffefa" stroke-width="5"/><path d="M${p1[0]} ${p1[1]-wallH*.48}L${p2[0]} ${p2[1]-wallH*.48}" stroke="#c9b9ad" stroke-width="1.4"/>`;}
    svg+=`</g><g transform="translate(28 482)"><rect width="744" height="25" rx="12.5" fill="#fffefa" stroke="#e8def1"/><circle cx="15" cy="12.5" r="5" fill="${home.accent_color}"/><text x="27" y="16" font-family="DM Sans,sans-serif" font-size="9.5" font-weight="600" fill="#6e6382">${xml(home.palette_name)} · ${xml(home.floor_material)} · ${xml(home.wall_finish)} · ${xml(home.window_material)} windows · ${xml(home.furniture)} furniture</text></g><g transform="translate(28 48)"><rect width="118" height="23" rx="11.5" fill="#fffefa" stroke="#e8def1"/><circle cx="13" cy="11.5" r="4" fill="#6d55bf"/><text x="23" y="15" font-family="DM Sans,sans-serif" font-size="8" font-weight="700" fill="#57476c">${levelRooms.length} SPACES · ${home.floors} LEVEL${home.floors>1?"S":""}</text></g></svg>`;
    return svg;
  }

  function displayPanel(n){
    activePanel=Math.max(0,Math.min(2,n));
    document.querySelectorAll("[data-result-panel]").forEach(panel=>panel.hidden=Number(panel.dataset.resultPanel)!==activePanel);
    document.querySelectorAll("[data-result-step]").forEach(button=>button.classList.toggle("active",Number(button.dataset.resultStep)===activePanel));
    if(activePanel===1)document.getElementById("plan2d").innerHTML=render2d(floor2d);
    if(activePanel===2)document.getElementById("plan3d").innerHTML=render3d(floor3d);
  }
  document.querySelectorAll("[data-result-step]").forEach(button=>button.addEventListener("click",()=>displayPanel(Number(button.dataset.resultStep))));
  document.querySelectorAll("[data-next-result]").forEach(button=>button.addEventListener("click",()=>displayPanel(activePanel+1)));
  document.querySelectorAll("[data-prev-result]").forEach(button=>button.addEventListener("click",()=>displayPanel(activePanel-1)));
  document.getElementById("floorPicker")?.addEventListener("change",event=>{floor2d=Number(event.target.value);document.getElementById("plan2d").innerHTML=render2d(floor2d);});
  document.getElementById("floorPicker3d")?.addEventListener("change",event=>{floor3d=Number(event.target.value);document.getElementById("plan3d").innerHTML=render3d(floor3d);});
  const canvas3d=document.getElementById("plan3d");
  let drag=null;
  canvas3d?.addEventListener("pointerdown",event=>{if(!event.target.closest("svg"))return;drag={x:event.clientX,y:event.clientY};canvas3d.setPointerCapture(event.pointerId);canvas3d.classList.add("is-dragging");});
  canvas3d?.addEventListener("pointermove",event=>{if(!drag)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;drag={x:event.clientX,y:event.clientY};orbit+=dx*.012;tilt=Math.max(-.7,Math.min(.7,tilt+dy*.006));canvas3d.innerHTML=render3d(floor3d);});
  const endDrag=()=>{drag=null;canvas3d?.classList.remove("is-dragging");};
  canvas3d?.addEventListener("pointerup",endDrag);canvas3d?.addEventListener("pointercancel",endDrag);
  canvas3d?.addEventListener("wheel",event=>{event.preventDefault();zoom=Math.max(.72,Math.min(1.35,zoom*(event.deltaY<0?1.08:.92)));canvas3d.innerHTML=render3d(floor3d);},{passive:false});
  document.getElementById("spin3d")?.addEventListener("click",event=>{if(spinTimer){clearInterval(spinTimer);spinTimer=null;event.currentTarget.textContent="⟳ Auto rotate";}else{event.currentTarget.textContent="Ⅱ Stop rotation";spinTimer=setInterval(()=>{orbit+=.025;canvas3d.innerHTML=render3d(floor3d);},45);}});
  document.querySelectorAll("[data-save-svg]").forEach(button=>button.addEventListener("click",()=>{
    const svg=document.querySelector(`#${button.dataset.saveSvg}`).querySelector("svg");
    if(!svg)return;
    const blob=new Blob([new XMLSerializer().serializeToString(svg)],{type:"image/svg+xml;charset=utf-8"});
    const anchor=document.createElement("a");anchor.href=URL.createObjectURL(blob);anchor.download=`nivasa-${button.dataset.saveSvg}-${button.dataset.saveSvg==="plan2d"?floor2d:floor3d}.svg`;anchor.click();URL.revokeObjectURL(anchor.href);
  }));
})();
