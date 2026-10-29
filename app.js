(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const els = {
    photoInput:$("photoInput"),dropzone:$("dropzone"),fileRow:$("fileRow"),fileName:$("fileName"),removePhoto:$("removePhoto"),
    emptyPreview:$("emptyPreview"),editCanvas:$("editCanvas"),sheetCanvas:$("sheetCanvas"),sheetEmpty:$("sheetEmpty"),
    brightness:$("brightness"),contrast:$("contrast"),saturation:$("saturation"),sharpness:$("sharpness"),
    sheetSize:$("sheetSize"),orientation:$("orientation"),photoPreset:$("photoPreset"),copies:$("copies"),
    photoWidth:$("photoWidth"),photoHeight:$("photoHeight"),sheetWidth:$("sheetWidth"),sheetHeight:$("sheetHeight"),
    topMargin:$("topMargin"),sideMargin:$("sideMargin"),photoGap:$("photoGap"),borderWidth:$("borderWidth"),
    borderColor:$("borderColor"),sheetBackground:$("sheetBackground"),photoFit:$("photoFit"),dpi:$("dpi"),
    downloadPng:$("downloadPng"),downloadPdf:$("downloadPdf"),printSheet:$("printSheet"),status:$("status")
  };
  const ctx = els.editCanvas.getContext("2d", {willReadFrequently:true});
  const sheetCtx = els.sheetCanvas.getContext("2d");
  let sourceImage = null, sourceName = "passport-photo", rotation = 0, flipH = false, activeFilter = "original";
  let baseCanvas = document.createElement("canvas"), baseCtx = baseCanvas.getContext("2d", {willReadFrequently:true});
  const presets = {
    "35x45":[35,45],"35x35":[35,35],"25x35":[25,35],"40x50":[40,50]
  };
  const sheetPresets = {
    a4:[210,297],"4r":[102,152],"5x7":[127,178],letter:[216,279],custom:[210,297]
  };
  const filterSettings = {
    original:{b:100,c:100,s:100,sepia:0,gray:0},
    natural:{b:103,c:104,s:94,sepia:0,gray:0},
    bright:{b:112,c:106,s:105,sepia:0,gray:0},
    mono:{b:100,c:108,s:0,sepia:0,gray:1},
    warm:{b:103,c:102,s:103,sepia:12,gray:0}
  };
  function say(message,type="") { els.status.textContent=message; els.status.className="status"+(type?" "+type:""); }
  function number(el, fallback=0) { const n=Number(el.value); return Number.isFinite(n)?n:fallback; }
  function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
  function mmToPx(mm,dpi){return Math.round(mm*dpi/25.4);}
  function getSheetSize(){let w=number(els.sheetWidth,210),h=number(els.sheetHeight,297);if(els.orientation.value==="landscape" && w<h)[w,h]=[h,w];if(els.orientation.value==="portrait" && w>h)[w,h]=[h,w];return [w,h];}
  function getPhotoSize(){return [clamp(number(els.photoWidth,35),10,100),clamp(number(els.photoHeight,45),10,120)];}
  function imageFilterCss(){
    const f=filterSettings[activeFilter]||filterSettings.original;
    const b=number(els.brightness,100)*f.b/100;
    const c=number(els.contrast,100)*f.c/100;
    const s=number(els.saturation,100)*f.s/100;
    return `brightness(${b}%) contrast(${c}%) saturate(${s}%)${f.sepia?` sepia(${f.sepia}%)`:""}${f.gray?` grayscale(${f.gray*100}%)`:""}`;
  }
  function drawEditedCanvas(){
    if(!sourceImage)return;
    const iw=sourceImage.naturalWidth||sourceImage.width, ih=sourceImage.naturalHeight||sourceImage.height;
    const rotated=Math.abs(rotation)%180===90;
    const maxDim=2200;
    let w=rotated?ih:iw,h=rotated?iw:ih;
    const scale=Math.min(1,maxDim/Math.max(w,h));
    w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale));
    els.editCanvas.width=w;els.editCanvas.height=h;els.editCanvas.classList.remove("hidden");els.emptyPreview.classList.add("hidden");
    ctx.save();ctx.clearRect(0,0,w,h);ctx.translate(w/2,h/2);ctx.rotate(rotation*Math.PI/180);ctx.scale(flipH?-1:1,1);
    const drawW=rotated?h:w, drawH=rotated?w:h;
    ctx.filter=imageFilterCss();ctx.drawImage(sourceImage,-drawW/2,-drawH/2,drawW,drawH);ctx.filter="none";ctx.restore();
    // A light, conservative edge enhancement approximation; 0 means untouched.
    const sharp=number(els.sharpness,0);
    if(sharp>0 && w*h<3500000){
      try{
        const img=ctx.getImageData(0,0,w,h), d=img.data, copy=new Uint8ClampedArray(d);
        const strength=sharp*0.22;
        for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
          const i=(y*w+x)*4;
          for(let c=0;c<3;c++){const avg=(copy[i-4+c]+copy[i+4+c]+copy[i-w*4+c]+copy[i+w*4+c])/4;d[i+c]=clamp(copy[i+c]+(copy[i+c]-avg)*strength,0,255);}
        }
        ctx.putImageData(img,0,0);
      }catch(e){}
    }
    updateValueLabels();renderSheet();
  }
  function loadPhoto(file){
    if(!file || !file.type.startsWith("image/")){say("Please choose a valid image file.","error");return;}
    const url=URL.createObjectURL(file), img=new Image();
    img.onload=()=>{if(sourceImage&&sourceImage._url)URL.revokeObjectURL(sourceImage._url);sourceImage=img;sourceImage._url=url;sourceName=(file.name||"passport-photo").replace(/\.[^.]+$/,"").replace(/[^\w-]+/g,"-")||"passport-photo";rotation=0;flipH=false;activeFilter="original";
      ["brightness","contrast","saturation"].forEach(id=>$(id).value=100);$("sharpness").value=0;
      document.querySelectorAll(".filter-chip").forEach(b=>b.classList.toggle("active",b.dataset.filter==="original"));
      els.fileName.textContent=file.name;els.fileRow.classList.remove("hidden");els.downloadPng.disabled=els.downloadPdf.disabled=els.printSheet.disabled=false;
      drawEditedCanvas();say("Photo loaded. Adjust it, then customize your print sheet.","success");};
    img.onerror=()=>{URL.revokeObjectURL(url);say("Could not open this image. Try a JPG or PNG file.","error");};img.src=url;
  }
  function updateValueLabels(){
    $("brightnessVal").textContent=els.brightness.value+"%";$("contrastVal").textContent=els.contrast.value+"%";$("saturationVal").textContent=els.saturation.value+"%";$("sharpnessVal").textContent=els.sharpness.value;
    $("topMarginVal").textContent=number(els.topMargin)+" mm";$("sideMarginVal").textContent=number(els.sideMargin)+" mm";$("gapVal").textContent=number(els.photoGap)+" mm";$("borderVal").textContent=number(els.borderWidth).toFixed(1)+" mm";
  }
  function buildEditedImage(dpi=300){
    const [pw,ph]=getPhotoSize(), w=mmToPx(pw,dpi),h=mmToPx(ph,dpi);
    const out=document.createElement("canvas");out.width=w;out.height=h;const c=out.getContext("2d");
    c.fillStyle="#fff";c.fillRect(0,0,w,h);
    if(!sourceImage)return out;
    // Draw the edited preview proportionally into the requested photo box.
    const src=els.editCanvas, sw=src.width,sh=src.height;
    const fit=els.photoFit.value, scale=fit==="cover"?Math.max(w/sw,h/sh):Math.min(w/sw,h/sh);
    const dw=sw*scale,dh=sh*scale;c.drawImage(src,(w-dw)/2,(h-dh)/2,dw,dh);
    return out;
  }
  function layoutCopies(sheetW,sheetH,photoW,photoH,gap,side,top,requested){
    const availW=Math.max(0,sheetW-side*2), availH=Math.max(0,sheetH-top-side);
    const cols=Math.max(0,Math.floor((availW+gap)/(photoW+gap)));
    const rows=Math.max(0,Math.floor((availH+gap)/(photoH+gap)));
    const capacity=cols*rows, count=Math.min(requested,capacity), items=[];
    if(!cols||!rows)return {cols,rows,capacity,count,items};
    let n=0;
    for(let r=0;r<rows&&n<count;r++)for(let col=0;col<cols&&n<count;col++,n++){
      items.push({x:side+col*(photoW+gap),y:top+r*(photoH+gap)});
    }
    return {cols,rows,capacity,count,items};
  }
  function renderSheet(){
    updateValueLabels();
    const [sw,sh]=getSheetSize(),[pw,ph]=getPhotoSize(),dpi=clamp(number(els.dpi,300),72,600);
    const margin=number(els.sideMargin,5),top=number(els.topMargin,5),gap=number(els.photoGap,3),requested=clamp(Math.round(number(els.copies,8)),1,120);
    const pxW=mmToPx(sw,Math.min(dpi,300)),pxH=mmToPx(sh,Math.min(dpi,300));
    els.sheetCanvas.width=pxW;els.sheetCanvas.height=pxH;els.sheetCanvas.style.aspectRatio=`${sw}/${sh}`;
    const ctx=sheetCtx;ctx.clearRect(0,0,pxW,pxH);ctx.fillStyle=els.sheetBackground.value;ctx.fillRect(0,0,pxW,pxH);
    const scale=pxW/sw, layout=layoutCopies(sw,sh,pw,ph,gap,margin,top,requested);
    if(sourceImage){
      const photo=buildEditedImage(Math.min(dpi,300)), bw=number(els.borderWidth,0), bc=els.borderColor.value;
      layout.items.forEach(p=>{
        const x=p.x*scale,y=p.y*scale,w=pw*scale,h=ph*scale;
        ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.fillStyle="#fff";ctx.fillRect(x,y,w,h);
        ctx.drawImage(photo,x,y,w,h);
        if(bw>0){ctx.lineWidth=Math.max(.5,bw*scale);ctx.strokeStyle=bc;ctx.strokeRect(x+ctx.lineWidth/2,y+ctx.lineWidth/2,w-ctx.lineWidth,h-ctx.lineWidth);}
        ctx.restore();
      });
      els.sheetEmpty.classList.add("hidden");
    }else{els.sheetEmpty.classList.remove("hidden");}
    $("statSheet").textContent=`${sw} × ${sh} mm · ${els.orientation.value}`;
    $("statCopies").textContent=`${layout.count} / ${requested}`;
    $("statPhoto").textContent=`${pw} × ${ph} mm`;
    $("statDpi").textContent=`${dpi} DPI`;
    if(sourceImage&&layout.count<requested)say(`Only ${layout.count} of ${requested} copies fit. Reduce photo size, margins or gap, or choose a larger sheet.`,"");
  }
  function autoFitCopies(){
    const [sw,sh]=getSheetSize(),[pw,ph]=getPhotoSize();
    const l=layoutCopies(sw,sh,pw,ph,number(els.photoGap),number(els.sideMargin),number(els.topMargin),120);
    els.copies.value=Math.max(1,l.capacity);renderSheet();say(`Maximum fit calculated: ${l.capacity} copies on this sheet.`, "success");
  }
  function resetSheet(){
    els.sheetSize.value="a4";els.orientation.value="portrait";els.photoPreset.value="35x45";els.copies.value=8;els.photoWidth.value=35;els.photoHeight.value=45;els.sheetWidth.value=210;els.sheetHeight.value=297;
    els.topMargin.value=5;els.sideMargin.value=5;els.photoGap.value=3;els.borderWidth.value=.2;els.borderColor.value="#b8c1d1";els.sheetBackground.value="#ffffff";els.photoFit.value="cover";els.dpi.value=300;
    syncSheetDimensions();renderSheet();say("Sheet settings reset.");
  }
  function syncSheetDimensions(){
    const preset=els.sheetSize.value, custom=preset==="custom";
    els.sheetWidth.disabled=!custom;els.sheetHeight.disabled=!custom;
    if(!custom){[els.sheetWidth.value,els.sheetHeight.value]=sheetPresets[preset];}
    const isCustomPhoto=els.photoPreset.value==="custom";
    if(!isCustomPhoto){const [w,h]=presets[els.photoPreset.value];els.photoWidth.value=w;els.photoHeight.value=h;}
    renderSheet();
  }
  function downloadBlob(blob,name){const a=document.createElement("a"),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  function exportCanvasAtDpi(dpi){
    const [sw,sh]=getSheetSize(),[pw,ph]=getPhotoSize(),margin=number(els.sideMargin),top=number(els.topMargin),gap=number(els.photoGap),requested=clamp(Math.round(number(els.copies,8)),1,120);
    const w=mmToPx(sw,dpi),h=mmToPx(sh,dpi),out=document.createElement("canvas");out.width=w;out.height=h;
    const c=out.getContext("2d");c.fillStyle=els.sheetBackground.value;c.fillRect(0,0,w,h);
    const layout=layoutCopies(sw,sh,pw,ph,gap,margin,top,requested),photo=buildEditedImage(dpi),scale=w/sw,bw=number(els.borderWidth),bc=els.borderColor.value;
    layout.items.forEach(p=>{const x=p.x*scale,y=p.y*scale,ww=pw*scale,hh=ph*scale;c.drawImage(photo,x,y,ww,hh);if(bw>0){c.lineWidth=Math.max(.5,bw*scale);c.strokeStyle=bc;c.strokeRect(x+c.lineWidth/2,y+c.lineWidth/2,ww-c.lineWidth,hh-c.lineWidth);}});
    return {canvas:out,layout,sw,sh,pw,ph};
  }
  function downloadPNG(){
    if(!sourceImage)return;const dpi=clamp(number(els.dpi,300),72,600);say("Preparing high-resolution PNG…");
    try{const result=exportCanvasAtDpi(dpi);result.canvas.toBlob(blob=>{if(blob){downloadBlob(blob,`${sourceName}-print-sheet-${dpi}dpi.png`);say(`PNG exported at ${dpi} DPI. Copies placed: ${result.layout.count}.`,"success");}else say("PNG export failed. Try a smaller DPI setting.","error");},"image/png");}
    catch(e){say("Could not export this sheet. Try 150 or 240 DPI on this device.","error");}
  }
  async function downloadPDF(){
    if(!sourceImage)return;
    if(!window.jspdf||!window.jspdf.jsPDF){say("PDF library did not load. Connect to the internet and reload, or download the PNG.","error");return;}
    const dpi=clamp(number(els.dpi,300),72,600);say("Preparing PDF…");
    try{const result=exportCanvasAtDpi(dpi),data=result.canvas.toDataURL("image/jpeg",.98),{jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:result.sw>=result.sh?"landscape":"portrait",unit:"mm",format:[result.sw,result.sh],compress:true});pdf.addImage(data,"JPEG",0,0,result.sw,result.sh,undefined,"FAST");pdf.save(`${sourceName}-print-sheet.pdf`);say(`PDF exported. Check print dialog for 100% / Actual size. ${result.layout.count} copies placed.`,"success");}
    catch(e){say("PDF export failed. Try PNG export or a lower DPI.","error");}
  }
  function printSheet(){
    if(!sourceImage)return;const [sw,sh]=getSheetSize(),dpi=clamp(number(els.dpi,300),72,600),result=exportCanvasAtDpi(dpi),root=$("printRoot");root.innerHTML="";
    const sheet=document.createElement("div");sheet.className="print-sheet";sheet.style.width=sw+"mm";sheet.style.height=sh+"mm";
    const img=document.createElement("img");img.src=result.canvas.toDataURL("image/png");img.style.width="100%";img.style.height="100%";img.style.display="block";sheet.appendChild(img);root.appendChild(sheet);
    const style=document.createElement("style");style.id="dynamicPrintStyle";style.textContent=`@page{size:${sw}mm ${sh}mm;margin:0} @media print{html,body{width:${sw}mm!important;height:${sh}mm!important;margin:0!important;padding:0!important;overflow:hidden!important}#printRoot{display:block!important;width:${sw}mm!important;height:${sh}mm!important}#printRoot .print-sheet{width:${sw}mm!important;height:${sh}mm!important;page-break-after:avoid!important}}`;
    document.head.appendChild(style);window.onafterprint=()=>{style.remove();root.innerHTML="";window.onafterprint=null;};window.print();
  }
  els.photoInput.addEventListener("change",e=>loadPhoto(e.target.files&&e.target.files[0]));
  ["dragenter","dragover"].forEach(ev=>els.dropzone.addEventListener(ev,e=>{e.preventDefault();els.dropzone.classList.add("dragover");}));
  ["dragleave","drop"].forEach(ev=>els.dropzone.addEventListener(ev,e=>{e.preventDefault();els.dropzone.classList.remove("dragover");}));
  els.dropzone.addEventListener("drop",e=>{const f=e.dataTransfer.files&&e.dataTransfer.files[0];if(f)loadPhoto(f);});
  els.removePhoto.addEventListener("click",()=>{if(sourceImage&&sourceImage._url)URL.revokeObjectURL(sourceImage._url);sourceImage=null;els.photoInput.value="";els.fileRow.classList.add("hidden");els.editCanvas.classList.add("hidden");els.emptyPreview.classList.remove("hidden");els.downloadPng.disabled=els.downloadPdf.disabled=els.printSheet.disabled=true;renderSheet();say("Photo removed.");});
  $("rotateLeft").addEventListener("click",()=>{rotation=(rotation+270)%360;drawEditedCanvas();});
  $("rotateRight").addEventListener("click",()=>{rotation=(rotation+90)%360;drawEditedCanvas();});
  $("flipH").addEventListener("click",()=>{flipH=!flipH;drawEditedCanvas();});
  $("resetEdit").addEventListener("click",()=>{rotation=0;flipH=false;activeFilter="original";["brightness","contrast","saturation"].forEach(id=>$(id).value=100);$("sharpness").value=0;document.querySelectorAll(".filter-chip").forEach(b=>b.classList.toggle("active",b.dataset.filter==="original"));if(sourceImage)drawEditedCanvas();say("Photo edits reset.");});
  ["brightness","contrast","saturation","sharpness"].forEach(id=>$(id).addEventListener("input",()=>{if(sourceImage)drawEditedCanvas();else updateValueLabels();}));
  document.querySelectorAll(".filter-chip").forEach(b=>b.addEventListener("click",()=>{activeFilter=b.dataset.filter;document.querySelectorAll(".filter-chip").forEach(x=>x.classList.toggle("active",x===b));if(sourceImage)drawEditedCanvas();}));
  els.sheetSize.addEventListener("change",syncSheetDimensions);els.orientation.addEventListener("change",()=>{syncSheetDimensions();});
  els.photoPreset.addEventListener("change",syncSheetDimensions);
  [els.copies,els.photoWidth,els.photoHeight,els.sheetWidth,els.sheetHeight].forEach(el=>el.addEventListener("input",()=>{if(el===els.photoWidth||el===els.photoHeight)els.photoPreset.value="custom";if(els.sheetSize.value==="custom")els.sheetWidth.disabled=els.sheetHeight.disabled=false;renderSheet();}));
  [els.topMargin,els.sideMargin,els.photoGap,els.borderWidth,els.borderColor,els.sheetBackground,els.photoFit,els.dpi].forEach(el=>el.addEventListener("input",renderSheet));
  $("autoCopies").addEventListener("click",autoFitCopies);$("resetSheet").addEventListener("click",resetSheet);
  els.downloadPng.addEventListener("click",downloadPNG);els.downloadPdf.addEventListener("click",downloadPDF);els.printSheet.addEventListener("click",printSheet);
  updateValueLabels();renderSheet();
})();