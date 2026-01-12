// ============================
// كلمة السر (غيّرها)
// ============================
const FAMILY_PASSWORD = "YAM123";

let db = null;
let peopleById = new Map();
let childrenByFather = new Map();

let zoom = 1;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.2;

// DOM
const selectedNameText = document.getElementById("selectedNameText");
const treeEl = document.getElementById("tree");
const treeViewport = document.getElementById("treeViewport");

const searchInput = document.getElementById("searchInput");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const editorPanel = document.getElementById("editorPanel");

const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const resetBtn = document.getElementById("resetBtn");

const editPersonSelect = document.getElementById("editPersonSelect");
const editNameInput = document.getElementById("editNameInput");
const editFatherSelect = document.getElementById("editFatherSelect");
const editMotherSelect = document.getElementById("editMotherSelect");
const saveEditBtn = document.getElementById("saveEditBtn");
const deleteBtn = document.getElementById("deleteBtn");

const addNameInput = document.getElementById("addNameInput");
const addGenderSelect = document.getElementById("addGenderSelect");
const addFatherSelect = document.getElementById("addFatherSelect");
const addMotherSelect = document.getElementById("addMotherSelect");
const addPersonBtn = document.getElementById("addPersonBtn");

const outputPanel = document.getElementById("outputPanel");
const jsonOutput = document.getElementById("jsonOutput");
const copyJsonBtn = document.getElementById("copyJsonBtn");
const closeOutputBtn = document.getElementById("closeOutputBtn");

// Import DOM
const importFile = document.getElementById("importFile");
const importRootName = document.getElementById("importRootName");
const runImportBtn = document.getElementById("runImportBtn");

// تحميل JSON
async function loadDB(){
  const res = await fetch("family.json", { cache: "no-store" });
  if(!res.ok) throw new Error("لم يتم العثور على family.json");
  db = await res.json();
  if(!db || !Array.isArray(db.people) || !db.rootId){
    throw new Error("صيغة family.json غير صحيحة");
  }
  rebuildIndexes();
}

function rebuildIndexes(){
  peopleById = new Map();
  childrenByFather = new Map();

  for(const p of db.people){
    peopleById.set(p.id, p);
  }
  for(const p of db.people){
    const f = p.father;
    if(!f) continue;
    if(!childrenByFather.has(f)) childrenByFather.set(f, []);
    childrenByFather.get(f).push(p.id);
  }

  for(const [fid, arr] of childrenByFather.entries()){
    arr.sort((a,b) => (peopleById.get(a)?.name || "").localeCompare(peopleById.get(b)?.name || "","ar"));
  }
}

// بناء الشجرة
function buildTree(rootId){
  treeEl.innerHTML = "";
  const root = peopleById.get(rootId);
  if(!root){
    treeEl.innerHTML = `<div style="padding:20px;color:#b91c1c;font-weight:900">لم يتم العثور على rootId</div>`;
    return;
  }
  const level = document.createElement("div");
  level.className = "level";
  level.appendChild(renderPersonBlock(rootId, true));
  treeEl.appendChild(level);
}

function renderPersonBlock(personId, isRoot=false){
  const p = peopleById.get(personId);

  const block = document.createElement("div");
  block.className = "personBlock" + (isRoot ? " root" : "");

  const node = document.createElement("div");
  node.className = "node";
  node.textContent = p?.name || "—";
  node.dataset.id = personId;
  node.dataset.name = p?.name || "";

  const fatherName = p?.father ? (peopleById.get(p.father)?.name || "") : "";
  const sub = document.createElement("div");
  sub.className = "nodeSub";
  sub.textContent = fatherName ? `الأب: ${fatherName}` : "";
  if(!fatherName) sub.style.display = "none";

  const nodeWrap = document.createElement("div");
  nodeWrap.style.display = "flex";
  nodeWrap.style.flexDirection = "column";
  nodeWrap.style.alignItems = "center";
  nodeWrap.appendChild(node);
  nodeWrap.appendChild(sub);

  block.appendChild(nodeWrap);

  const kids = childrenByFather.get(personId) || [];
  if(kids.length){
    const row = document.createElement("div");
    row.className = "childrenRow";

    for(const kidId of kids){
      const childWrap = document.createElement("div");
      childWrap.className = "childWrap";
      childWrap.appendChild(renderPersonBlock(kidId, false));
      row.appendChild(childWrap);
    }
    block.appendChild(row);
  }

  return block;
}

// الضغط على الاسم => تحديث خانة الاسم المحدد
function wireNodeClick(){
  treeEl.addEventListener("click", (e) => {
    const node = e.target.closest(".node");
    if(!node) return;

    const fullName = node.dataset.name || node.textContent || "—";
    selectedNameText.textContent = fullName;

    treeEl.querySelectorAll(".node").forEach(n => n.removeAttribute("data-highlight"));
    node.setAttribute("data-highlight","1");
  });
}

// البحث
function searchByName(q){
  q = (q || "").trim();
  treeEl.querySelectorAll(".node").forEach(n => n.removeAttribute("data-highlight"));

  if(!q){
    selectedNameText.textContent = "—";
    return;
  }

  const found = db.people.find(p => (p.name || "").includes(q));
  if(!found){
    selectedNameText.textContent = "لا يوجد مطابق";
    return;
  }

  const el = treeEl.querySelector(`.node[data-id="${found.id}"]`);
  if(el){
    el.setAttribute("data-highlight","1");
    selectedNameText.textContent = found.name;

    const rect = el.getBoundingClientRect();
    const vpRect = treeViewport.getBoundingClientRect();
    treeViewport.scrollLeft += (rect.left - vpRect.left) - (vpRect.width / 2) + (rect.width / 2);
    treeViewport.scrollTop  += (rect.top  - vpRect.top ) - (vpRect.height/ 2) + (rect.height/2);
  } else {
    selectedNameText.textContent = found.name;
  }
}

// Zoom
function applyZoom(){ treeEl.style.transform = `scale(${zoom})`; }

function setupZoom(){
  zoomInBtn.addEventListener("click", () => {
    zoom = Math.min(ZOOM_MAX, +(zoom + 0.1).toFixed(2));
    applyZoom();
  });
  zoomOutBtn.addEventListener("click", () => {
    zoom = Math.max(ZOOM_MIN, +(zoom - 0.1).toFixed(2));
    applyZoom();
  });
  resetBtn.addEventListener("click", () => {
    zoom = 1;
    applyZoom();
    treeViewport.scrollTop = 0;
    treeViewport.scrollLeft = 0;
  });
}

// سحب للتحريك (Mouse + Touch)
function setupPan(){
  let isDown = false;
  let startX = 0, startY = 0;
  let scrollLeft = 0, scrollTop = 0;

  const start = (clientX, clientY) => {
    isDown = true;
    const rect = treeViewport.getBoundingClientRect();
    startX = clientX - rect.left;
    startY = clientY - rect.top;
    scrollLeft = treeViewport.scrollLeft;
    scrollTop = treeViewport.scrollTop;
  };

  const move = (clientX, clientY) => {
    if(!isDown) return;
    const rect = treeViewport.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const walkX = (x - startX);
    const walkY = (y - startY);
    treeViewport.scrollLeft = scrollLeft - walkX;
    treeViewport.scrollTop  = scrollTop  - walkY;
  };

  const end = () => { isDown = false; };

  // Mouse
  treeViewport.addEventListener("mousedown", (e) => {
    if(e.target.closest(".node")) return;
    start(e.clientX, e.clientY);
  });
  window.addEventListener("mouseup", end);
  treeViewport.addEventListener("mouseleave", end);
  treeViewport.addEventListener("mousemove", (e) => {
    if(!isDown) return;
    e.preventDefault();
    move(e.clientX, e.clientY);
  });

  // Touch
  treeViewport.addEventListener("touchstart", (e) => {
    if(e.target.closest(".node")) return;
    const t = e.touches[0];
    start(t.clientX, t.clientY);
  }, { passive: true });

  treeViewport.addEventListener("touchend", end, { passive: true });

  treeViewport.addEventListener("touchmove", (e) => {
    if(!isDown) return;
    const t = e.touches[0];
    move(t.clientX, t.clientY);
  }, { passive: true });
}

// وضع التعديل
function isEditMode(){ return sessionStorage.getItem("editMode") === "1"; }
function setEditMode(v){
  sessionStorage.setItem("editMode", v ? "1" : "0");
  renderEditUIVisibility();
}
function renderEditUIVisibility(){
  const on = isEditMode();
  editorPanel.classList.toggle("hidden", !on);
  logoutBtn.classList.toggle("hidden", !on);
  loginBtn.classList.toggle("hidden", on);
}

function setupAuth(){
  renderEditUIVisibility();

  loginBtn.addEventListener("click", () => {
    const pass = prompt("أدخل الرقم السري للتعديل:");
    if(pass === null) return;
    if(pass === FAMILY_PASSWORD){
      setEditMode(true);
      refreshEditorSelects();
      alert("تم تفعيل وضع التعديل ✅");
    } else {
      alert("الرقم غير صحيح ❌");
    }
  });

  logoutBtn.addEventListener("click", () => {
    setEditMode(false);
    alert("تم الخروج من وضع التعديل.");
  });
}

// محرر البيانات
function refreshEditorSelects(){
  const peopleSorted = [...db.people].sort((a,b)=> (a.name||"").localeCompare(b.name||"","ar"));

  fillSelect(editPersonSelect, peopleSorted, "اختر شخص...");
  fillSelect(editFatherSelect, [{id:"",name:"— بدون —"}, ...peopleSorted]);
  fillSelect(editMotherSelect, [{id:"",name:"— بدون —"}, ...peopleSorted]);

  fillSelect(addFatherSelect, [{id:"",name:"— بدون —"}, ...peopleSorted]);
  fillSelect(addMotherSelect, [{id:"",name:"— بدون —"}, ...peopleSorted]);

  if(peopleSorted.length){
    editPersonSelect.value = peopleSorted[0].id;
    loadPersonToEditForm(peopleSorted[0].id);
  }
}

function fillSelect(selectEl, items, placeholder){
  selectEl.innerHTML = "";
  if(placeholder){
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = placeholder;
    selectEl.appendChild(opt);
  }
  for(const it of items){
    const opt = document.createElement("option");
    opt.value = it.id;
    opt.textContent = it.name;
    selectEl.appendChild(opt);
  }
}

function loadPersonToEditForm(id){
  const p = peopleById.get(id);
  if(!p) return;
  editNameInput.value = p.name || "";
  editFatherSelect.value = p.father || "";
  editMotherSelect.value = p.mother || "";
}

function setupEditorEvents(){
  editPersonSelect.addEventListener("change", () => {
    if(!editPersonSelect.value) return;
    loadPersonToEditForm(editPersonSelect.value);
  });

  saveEditBtn.addEventListener("click", () => {
    const id = editPersonSelect.value;
    if(!id) return alert("اختر شخص أولاً.");
    const p = peopleById.get(id);
    if(!p) return;

    const newName = editNameInput.value.trim();
    if(!newName) return alert("اكتب الاسم.");

    const newFather = editFatherSelect.value || undefined;
    if(newFather && newFather === id) return alert("لا يمكن أن يكون الشخص أب لنفسه.");

    const newMother = editMotherSelect.value || undefined;
    if(newMother && newMother === id) return alert("لا يمكن أن تكون الأم هي نفس الشخص.");

    p.name = newName;
    if(newFather) p.father = newFather; else delete p.father;
    if(newMother) p.mother = newMother; else delete p.mother;

    rebuildIndexes();
    buildTree(db.rootId);
    refreshEditorSelects();
    showJsonOutput();
  });

  addPersonBtn.addEventListener("click", () => {
    const name = addNameInput.value.trim();
    if(!name) return alert("اكتب الاسم الكامل.");

    const gender = addGenderSelect.value || "M";
    const father = addFatherSelect.value || undefined;
    const mother = addMotherSelect.value || undefined;

    const id = generateId();
    const newPerson = { id, name, gender };
    if(father) newPerson.father = father;
    if(mother) newPerson.mother = mother;

    db.people.push(newPerson);

    rebuildIndexes();
    buildTree(db.rootId);
    refreshEditorSelects();

    addNameInput.value = "";
    addGenderSelect.value = "M";
    addFatherSelect.value = "";
    addMotherSelect.value = "";

    showJsonOutput();
  });

  deleteBtn.addEventListener("click", () => {
    const id = editPersonSelect.value;
    if(!id) return alert("اختر شخص أولاً.");
    if(id === db.rootId) return alert("لا يمكن حذف الجذر (root).");

    const p = peopleById.get(id);
    if(!p) return;

    const ok = confirm(`متأكد تبغى تحذف: ${p.name} ؟`);
    if(!ok) return;

    db.people = db.people.filter(x => x.id !== id);

    for(const x of db.people){
      if(x.father === id) delete x.father;
      if(x.mother === id) delete x.mother;
    }

    rebuildIndexes();
    buildTree(db.rootId);
    refreshEditorSelects();
    showJsonOutput();
  });
}

function generateId(){
  let n = 1;
  const used = new Set(db.people.map(p => p.id));
  while(used.has(`p${n}`)) n++;
  return `p${n}`;
}

// إخراج JSON
function showJsonOutput(){
  outputPanel.classList.remove("hidden");
  jsonOutput.value = JSON.stringify(db, null, 2);
  jsonOutput.focus();
  jsonOutput.select();
}

function setupOutputPanel(){
  copyJsonBtn.addEventListener("click", async () => {
    try{
      await navigator.clipboard.writeText(jsonOutput.value);
      alert("تم النسخ ✅");
    }catch{
      jsonOutput.focus();
      jsonOutput.select();
      document.execCommand("copy");
      alert("تم النسخ ✅");
    }
  });
  closeOutputBtn.addEventListener("click", () => {
    outputPanel.classList.add("hidden");
  });
}

/* =========================
   IMPORT CSV -> family.json
   ========================= */
function slugId(name){
  const base = (name || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\u0600-\u06FF0-9_]+/g, "");
  return base || "p";
}

function parsePairs(text){
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const pairs = [];
  for(const line of lines){
    if(line.startsWith("#")) continue;
    const parts = line.split(",").map(x => x.trim());
    if(parts.length < 2) continue;
    const father = parts[0];
    const child  = parts[1];
    if(!father || !child) continue;
    pairs.push([father, child]);
  }
  return pairs;
}

function buildDbFromPairs(rootName, pairs){
  const names = new Set();
  names.add(rootName);
  for(const [f,c] of pairs){ names.add(f); names.add(c); }

  const used = new Map(); // base -> count
  const nameToId = new Map();

  function getIdForName(n){
    if(nameToId.has(n)) return nameToId.get(n);
    const base = slugId(n);
    const count = (used.get(base) || 0) + 1;
    used.set(base, count);
    const id = count === 1 ? base : `${base}_${count}`;
    nameToId.set(n, id);
    return id;
  }

  const people = [];
  const rootId = getIdForName(rootName);
  people.push({ id: rootId, name: rootName, gender: "M" });

  for(const n of names){
    if(n === rootName) continue;
    const id = getIdForName(n);
    people.push({ id, name: n, gender: "M" });
  }

  const byId = new Map(people.map(p => [p.id, p]));
  for(const [fatherName, childName] of pairs){
    const fid = getIdForName(fatherName);
    const cid = getIdForName(childName);
    const child = byId.get(cid);
    if(child) child.father = fid;
  }

  return { rootId, people };
}

function setupImport(){
  if(!runImportBtn) return;

  runImportBtn.addEventListener("click", async () => {
    if(!isEditMode()) return alert("لازم تدخل وضع التعديل أولاً.");

    const rootName = (importRootName.value || "").trim();
    if(!rootName) return alert("اكتب اسم الجذر (Root) مثل: حسن");

    const file = importFile?.files?.[0];
    if(!file) return alert("ارفع ملف CSV / TXT أولاً.");

    const text = await file.text();
    const pairs = parsePairs(text);
    if(!pairs.length) return alert("الملف فاضي أو الصيغة غير صحيحة. لازم كل سطر: الأب,الابن");

    db = buildDbFromPairs(rootName, pairs);
    rebuildIndexes();
    buildTree(db.rootId);
    refreshEditorSelects();
    showJsonOutput();

    alert("تم توليد family.json ✅ انسخ JSON والصقه في family.json على GitHub ثم Commit.");
  });
}

// تشغيل
async function main(){
  await loadDB();
  buildTree(db.rootId);

  wireNodeClick();
  setupZoom();
  setupPan();
  setupAuth();
  setupEditorEvents();
  setupOutputPanel();
  setupImport();

  searchInput.addEventListener("input", () => searchByName(searchInput.value));

  if(isEditMode()){
    refreshEditorSelects();
  }

  applyZoom();
}

main().catch(err => {
  console.error(err);
  treeEl.innerHTML = `<div style="padding:20px;color:#b91c1c;font-weight:900">خطأ: ${err.message}</div>`;
});
