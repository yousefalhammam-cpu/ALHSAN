// ============================
// كلمة السر (غيّرها)
// ============================
const FAMILY_PASSWORD = "YAM123";

// قاعدة البيانات
let db = null;
let peopleById = new Map();
let childrenByFather = new Map();

let zoom = 1;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.2;

// عناصر DOM
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

// تحميل البيانات
async function loadDB(){
  const res = await fetch("family.json", { cache: "no-store" });
  if(!res.ok) throw new Error("لم يتم العثور على family.json");
  db = await res.json();
  rebuildIndexes();
}

// بناء خرائط البحث
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
    treeEl.innerHTML = `<div style="padding:20px;color:#b91c1c;font-weight:800">لم يتم العثور على rootId</div>`;
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

// سحب للتحريك داخل مساحة الشجرة
function setupPan(){
  let isDown = false;
  let startX = 0, startY = 0;
  let scrollLeft = 0, scrollTop = 0;

  treeViewport.addEventListener("mousedown", (e) => {
    if(e.target.closest(".node")) return;
    isDown = true;
    startX = e.pageX - treeViewport.offsetLeft;
    startY = e.pageY - treeViewport.offsetTop;
    scrollLeft = treeViewport.scrollLeft;
    scrollTop = treeViewport.scrollTop;
  });

  window.addEventListener("mouseup", () => isDown = false);
  treeViewport.addEventListener("mouseleave", () => isDown = false);

  treeViewport.addEventListener("mousemove", (e) => {
    if(!isDown) return;
    e.preventDefault();
    const x = e.pageX - treeViewport.offsetLeft;
    const y = e.pageY - treeViewport.offsetTop;
    const walkX = (x - startX);
    const walkY = (y - startY);
    treeViewport.scrollLeft = scrollLeft - walkX;
    treeViewport.scrollTop  = scrollTop  - walkY;
  });
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

  searchInput.addEventListener("input", () => searchByName(searchInput.value));

  if(isEditMode()){
    refreshEditorSelects();
  }

  applyZoom();
}

main().catch(err => {
  console.error(err);
  treeEl.innerHTML = `<div style="padding:20px;color:#b91c1c;font-weight:800">خطأ: ${err.message}</div>`;
});
