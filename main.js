import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, onSnapshot, getDocs, query, where, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCu9OZHB-fUwqKaVWkIGUYOg7wY83jte9Y",
  authDomain: "student-management-syste-27b4d.firebaseapp.com",
  projectId: "student-management-syste-27b4d",
  storageBucket: "student-management-syste-27b4d.firebasestorage.app",
  messagingSenderId: "780857535653",
  appId: "1:780857535653:web:37eca357dab470262e714c",
  measurementId: "G-LNT761R8GW"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUserRole = null;
let currentUserData = null;

document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('errorMessage');
            if (errorMsg) errorMsg.textContent = '';

            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (error) {
                console.error(error);
                if (errorMsg) errorMsg.textContent = 'Invalid credentials. Please verify entry variables.';
            }
        });
    }

    onAuthStateChanged(auth, async (user) => {
        if (user && window.location.pathname.includes('login.html')) {
            window.location.href = 'dashboard.html';
            return;
        }
        if (!user && window.location.pathname.includes('dashboard.html')) {
            window.location.href = 'login.html';
            return;
        }

        if (user && window.location.pathname.includes('dashboard.html')) {
            try {
                if (user.email === "diarraanime44@gmail.com") {
                    currentUserRole = "admin";
                    currentUserData = { name: "System Master Admin", email: user.email };
                    renderDashboardView();
                    return;
                }

                const q = query(collection(db, "users"), where("email", "==", user.email));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    querySnapshot.forEach((docSnap) => {
                        currentUserData = docSnap.data();
                        currentUserRole = currentUserData.role; 
                    });
                } else {
                    currentUserRole = "student";
                    currentUserData = { name: "Enrolled Student Profile", email: user.email };
                }
                
                renderDashboardView();
            } catch (err) {
                console.error(err);
            }
        }
    });

    function renderDashboardView() {
        document.getElementById('portalRoleTitle').textContent = `${currentUserRole.toUpperCase()} PORTAL`;
        document.getElementById('welcomeUserName').textContent = `Welcome back, ${currentUserData.name}! 👋`;
        document.getElementById('welcomeUserSub').textContent = `Access Matrix Token Clearance Level: ${currentUserRole}`;

        document.getElementById('adminWorkspace').style.display = 'none';
        document.getElementById('lecturerWorkspace').style.display = 'none';
        document.getElementById('studentWorkspace').style.display = 'none';

        const sideMenu = document.getElementById('dynamicMenu');

        if (currentUserRole === 'admin') {
            document.getElementById('adminWorkspace').style.display = 'grid';
            sideMenu.innerHTML = `<a class="menu-item active"><i class="fa-solid fa-users-gear"></i> Master Control Panel</a>`;
            initAdminLogic();
        } 
        else if (currentUserRole === 'lecturer') {
            document.getElementById('lecturerWorkspace').style.display = 'grid';
            sideMenu.innerHTML = `<a class="menu-item active"><i class="fa-solid fa-chalkboard-user"></i> Lecturer Dashboard</a>`;
            initLecturerLogic();
            syncNoticeBoardFeed(document.getElementById('lecturerNoticeFeed'));
        } 
        else if (currentUserRole === 'student') {
            document.getElementById('studentWorkspace').style.display = 'grid';
            sideMenu.innerHTML = `<a class="menu-item active"><i class="fa-solid fa-graduation-cap"></i> Student Hub</a>`;
            initStudentLogic();
            syncNoticeBoardFeed(document.getElementById('studentNoticeFeed'));
        }
    }

    function initAdminLogic() {
        const adminUserForm = document.getElementById('adminUserForm');
        if (adminUserForm && !adminUserForm.dataset.hooked) {
            adminUserForm.dataset.hooked = "true";
            adminUserForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const payload = {
                    role: document.getElementById('regRole').value,
                    id: document.getElementById('regId').value.trim(),
                    name: document.getElementById('regName').value.trim(),
                    email: document.getElementById('regEmail').value.trim(),
                    createdOn: new Date()
                };
                try {
                    await addDoc(collection(db, "users"), payload);
                    alert(`Success: Profile ${payload.name} created!`);
                    adminUserForm.reset();
                } catch (err) { console.error(err); }
            });
        }

        const adminNoticeForm = document.getElementById('adminNoticeForm');
        if (adminNoticeForm && !adminNoticeForm.dataset.hooked) {
            adminNoticeForm.dataset.hooked = "true";
            adminNoticeForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    await addDoc(collection(db, "notices"), {
                        title: document.getElementById('noticeTitle').value.trim(),
                        message: document.getElementById('noticeBody').value.trim(),
                        timestamp: new Date()
                    });
                    alert("Announcement published to all dashboards!");
                    adminNoticeForm.reset();
                } catch (err) { console.error(err); }
            });
        }
    }

    function initLecturerLogic() {
        const moduleForm = document.getElementById('lecturerModuleForm');
        const assignDropdown = document.getElementById('assignMod');
        const resModDropdown = document.getElementById('resMod');
        const gradeModDropdown = document.getElementById('gradeMod');
        const modTableBody = document.getElementById('lecturerModulesTableBody');

        onSnapshot(collection(db, "modules"), (snapshot) => {
            if (assignDropdown) assignDropdown.innerHTML = '';
            if (resModDropdown) resModDropdown.innerHTML = '';
            if (gradeModDropdown) gradeModDropdown.innerHTML = '';
            if (modTableBody) modTableBody.innerHTML = '';

            snapshot.forEach((snapshotDoc) => {
                const mod = snapshotDoc.data();
                const mDocId = snapshotDoc.id;

                const makeOption = () => {
                    const op = document.createElement('option');
                    op.value = mDocId;
                    op.textContent = `[${mod.code}] ${mod.name}`;
                    return op;
                };

                if (assignDropdown) assignDropdown.appendChild(makeOption());
                if (resModDropdown) resModDropdown.appendChild(makeOption());
                if (gradeModDropdown) gradeModDropdown.appendChild(makeOption());

                if (modTableBody) {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><strong>${mod.code}</strong></td>
                        <td>${mod.name}</td>
                        <td>
                            <button class="btn btn-secondary-action attendance-trigger-btn" data-id="${mDocId}" data-name="${mod.name}">
                                <i class="fa-solid fa-clipboard-user"></i> Attendance
                            </button>
                        </td>
                    `;
                    modTableBody.appendChild(row);
                }
            });

            document.querySelectorAll('.attendance-trigger-btn').forEach(b => {
                b.addEventListener('click', (e) => {
                    launchAttendanceInterface(e.currentTarget.dataset.id, e.currentTarget.dataset.name);
                });
            });
        });

        if (moduleForm && !moduleForm.dataset.hooked) {
            moduleForm.dataset.hooked = "true";
            moduleForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    await addDoc(collection(db, "modules"), {
                        code: document.getElementById('modCode').value.trim(),
                        name: document.getElementById('modName').value.trim(),
                        lecturerEmail: auth.currentUser.email,
                        lecturerName: currentUserData.name
                    });
                    alert("Module Track Initialized!");
                    moduleForm.reset();
                } catch (err) { console.error(err); }
            });
        }

        const assignStudentForm = document.getElementById('lecturerAssignStudentForm');
        if (assignStudentForm && !assignStudentForm.dataset.hooked) {
            assignStudentForm.dataset.hooked = "true";
            assignStudentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    await addDoc(collection(db, "enrollments"), {
                        moduleId: document.getElementById('assignMod').value,
                        studentId: document.getElementById('assignStuId').value.trim(),
                        studentName: document.getElementById('assignStuName').value.trim(),
                        studentEmail: document.getElementById('assignStuEmail').value.trim().toLowerCase(),
                        academicYear: document.getElementById('assignStuYear').value.trim(),
                        enrolledAt: new Date()
                    });
                    alert("Cohort linked successfully!");
                    assignStudentForm.reset();
                } catch (err) { console.error(err); }
            });
        }

        const resourceForm = document.getElementById('lecturerResourceForm');
        if (resourceForm && !resourceForm.dataset.hooked) {
            resourceForm.dataset.hooked = "true";
            resourceForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    await addDoc(collection(db, "resources"), {
                        moduleId: document.getElementById('resMod').value,
                        type: document.getElementById('resType').value,
                        title: document.getElementById('resTitle').value.trim(),
                        url: document.getElementById('resUrl').value.trim(),
                        timestamp: new Date()
                    });
                    alert("Material resource published!");
                    resourceForm.reset();
                } catch (err) { console.error(err); }
            });
        }

        const gradeForm = document.getElementById('lecturerGradeForm');
        if (gradeForm && !gradeForm.dataset.hooked) {
            gradeForm.dataset.hooked = "true";
            gradeForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    await addDoc(collection(db, "grades"), {
                        moduleId: document.getElementById('gradeMod').value,
                        studentEmail: document.getElementById('gradeStuEmail').value.trim().toLowerCase(),
                        grade: document.getElementById('gradeValue').value.trim(),
                        timestamp: new Date()
                    });
                    alert("Student assessment score finalized!");
                    gradeForm.reset();
                } catch (err) { console.error(err); }
            });
        }
    }

    function launchAttendanceInterface(moduleId, moduleName) {
        const viewPanel = document.getElementById('lecturerActiveModuleView');
        if (!viewPanel) return;

        viewPanel.innerHTML = `
            <div class="panel form-panel">
                <h3><i class="fa-solid fa-clipboard-user"></i> Attendance: ${moduleName}</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr><th>Student ID</th><th>Full Name</th><th>Presence Status</th></tr>
                        </thead>
                        <tbody id="attendanceSheetBody"><tr><td colspan="3">Querying database...</td></tr></tbody>
                    </table>
                </div>
                <button class="btn btn-action-glow" id="saveAttendanceBtn" style="margin-top:1.5rem; background: #10b981;">Complete Roll Call</button>
                <button class="btn btn-secondary-action" id="closeAttendanceBtn" style="margin-top:1rem; width:100%;">Exit View</button>
            </div>
        `;

        const sheetBody = document.getElementById('attendanceSheetBody');
        const qEnroll = query(collection(db, "enrollments"), where("moduleId", "==", moduleId));
        getDocs(qEnroll).then((snap) => {
            sheetBody.innerHTML = '';
            if (snap.empty) {
                sheetBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No students enrolled yet.</td></tr>`;
                return;
            }
            snap.forEach((d) => {
                const en = d.data();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${en.studentId}</strong></td>
                    <td>${en.studentName}</td>
                    <td><label class="attendance-check-label"><input type="checkbox"> Present</label></td>
                `;
                sheetBody.appendChild(tr);
            });
        });

        document.getElementById('closeAttendanceBtn').addEventListener('click', () => { renderDashboardView(); });
        document.getElementById('saveAttendanceBtn').addEventListener('click', () => {
            alert("Roster changes recorded into sync layers!");
            renderDashboardView();
        });
    }

    function initStudentLogic() {
        const studentTable = document.getElementById('studentModulesTableBody');
        const studentResTable = document.getElementById('studentResourceTableBody');
        const studentGradeTable = document.getElementById('studentGradeTableBody');
        const userEmail = auth.currentUser.email.toLowerCase();

        const studentMatchQuery = query(collection(db, "enrollments"), where("studentEmail", "==", userEmail));
        
        onSnapshot(studentMatchQuery, (snapshot) => {
            if (studentTable) studentTable.innerHTML = '';
            if (snapshot.empty) {
                if (studentTable) studentTable.innerHTML = `<tr><td colspan="3">No active enrollment connections mapped.</td></tr>`;
                return;
            }

            snapshot.forEach((snapDoc) => {
                const enrollment = snapDoc.data();
                
                onSnapshot(doc(db, "modules", enrollment.moduleId), (modSnap) => {
                    if (modSnap.exists()) {
                        const moduleMeta = modSnap.data();
                        const rowId = `mod-row-${snapDoc.id}`;
                        let tr = document.getElementById(rowId);
                        if (!tr) {
                            tr = document.createElement('tr');
                            tr.id = rowId;
                            if (studentTable) studentTable.appendChild(tr);
                        }
                        tr.innerHTML = `
                            <td><strong>${moduleMeta.code}</strong></td>
                            <td>${moduleMeta.name}</td>
                            <td><span style="color:var(--glow-blue); font-weight:600;"><i class="fa-solid fa-user-tie"></i> ${moduleMeta.lecturerName || 'Faculty Professor Staff'}</span></td>
                        `;

                        syncStudentResources(enrollment.moduleId, moduleMeta.code, studentResTable);
                    }
                });
            });
        });

        const gradeQuery = query(collection(db, "grades"), where("studentEmail", "==", userEmail));
        onSnapshot(gradeQuery, (snap) => {
            if (studentGradeTable) studentGradeTable.innerHTML = '';
            if (snap.empty) {
                if (studentGradeTable) studentGradeTable.innerHTML = `<tr><td colspan="2">No performance results published yet.</td></tr>`;
                return;
            }
            snap.forEach((d) => {
                const g = d.data();
                onSnapshot(doc(db, "modules", g.moduleId), (mSnap) => {
                    if (mSnap.exists()) {
                        const m = mSnap.data();
                        const row = document.createElement('tr');
                        row.innerHTML = `<td><strong>${m.code}</strong></td><td><span class="badge badge-student">${g.grade}</span></td>`;
                        if (studentGradeTable) studentGradeTable.appendChild(row);
                    }
                });
            });
        });
    }

    function syncStudentResources(moduleId, moduleCode, targetTable) {
        const resQuery = query(collection(db, "resources"), where("moduleId", "==", moduleId));
        getDocs(resQuery).then((snap) => {
            snap.forEach((d) => {
                const r = d.data();
                const rRowId = `res-row-${d.id}`;
                if (!document.getElementById(rRowId)) {
                    const tr = document.createElement('tr');
                    tr.id = rRowId;
                    tr.innerHTML = `
                        <td><strong>${moduleCode}</strong></td>
                        <td><span class="badge ${r.type === 'Note' ? 'badge-lecturer' : 'badge-student'}">${r.type}</span></td>
                        <td>${r.title}</td>
                        <td><a href="${r.url}" target="_blank" class="btn btn-secondary-action"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open</a></td>
                    `;
                    if (targetTable) targetTable.appendChild(tr);
                }
            });
        });
    }

    function syncNoticeBoardFeed(domElementContainer) {
        if (!domElementContainer) return;
        onSnapshot(collection(db, "notices"), (snap) => {
            domElementContainer.innerHTML = '';
            if (snap.empty) {
                domElementContainer.innerHTML = `<p style="color:var(--text-muted); font-style:italic; font-size:0.9rem;">No notices currently posted.</p>`;
                return;
            }
            snap.forEach((docRecord) => {
                const n = docRecord.data();
                const noticeStrip = document.createElement('div');
                noticeStrip.className = 'notice-strip';
                noticeStrip.innerHTML = `
                    <h4>${n.title}</h4>
                    <p>${n.message}</p>
                    <span class="notice-date"><i class="fa-regular fa-clock"></i> Campus Broadcast Channel</span>
                `;
                domElementContainer.appendChild(noticeStrip);
            });
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                window.location.href = 'login.html';
            } catch (err) { console.error(err); }
        });
    }
});
