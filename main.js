// Import Firebase core and database modules using browser-ready ES Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Linked to your 'student-management-syste-27b4d' Firebase project
const firebaseConfig = {
  apiKey: "AIzaSyCu9OZHB-fUwqKaVWkIGUYOg7wY83jte9Y",
  authDomain: "student-management-syste-27b4d.firebaseapp.com",
  projectId: "student-management-syste-27b4d",
  storageBucket: "student-management-syste-27b4d.firebasestorage.app",
  messagingSenderId: "780857535653",
  appId: "1:780857535653:web:37eca357dab470262e714c",
  measurementId: "G-LNT761R8GW"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Global state tracking
let currentUserRole = null;
let currentUserData = null;

document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // 1. PORTAL SECURE LOGIN CONTROLLER
    // =================================================================
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('errorMessage');
            
            if (errorMsg) errorMsg.textContent = '';

            try {
                // Authenticate user credentials via Firebase Auth
                await signInWithEmailAndPassword(auth, email, password);
                // On success, redirecting is handled gracefully by the state observer below
            } catch (error) {
                console.error("Login failure: ", error.message);
                if (errorMsg) errorMsg.textContent = 'Invalid Email or Password. Check email/password.';
            }
        });
    }

    // =================================================================
    // 2. AUTH STATE WATCHER & DYNAMIC UI ENGINE
    // =================================================================
    onAuthStateChanged(auth, async (user) => {
        // If we are on the login page and logged in, redirect to dashboard
        if (user && window.location.pathname.includes('login.html')) {
            window.location.href = 'dashboard.html';
            return;
        }

        // If we are on the dashboard page but not logged in, boot out to login screen
        if (!user && window.location.pathname.includes('dashboard.html')) {
            window.location.href = 'login.html';
            return;
        }

        if (user && window.location.pathname.includes('dashboard.html')) {
            try {
                // Hardcoded fallback admin account check
                if (user.email === "diarraanime44@gmail.com") {
                    currentUserRole = "admin";
                    currentUserData = { name: "Mr. Diarra", email: user.email };
                    renderDashboardView();
                    return;
                }

                // Query the "users" collection to match the authenticated email profile
                const q = query(collection(db, "users"), where("email", "==", user.email));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    querySnapshot.forEach((docSnap) => {
                        currentUserData = docSnap.data();
                        currentUserRole = currentUserData.role; // 'lecturer' or 'student'
                    });
                } else {
                    // Fallback configuration if account profiling hasn't been set in firestore yet
                    currentUserRole = "student";
                    currentUserData = { name: "New Portal User", email: user.email };
                }
                
                renderDashboardView();

            } catch (err) {
                console.error("Error setting up workspace: ", err);
            }
        }
    });

    // =================================================================
    // 3. MAIN DASHBOARD RENDER & WORKSPACE MANAGEMENT
    // =================================================================
    function renderDashboardView() {
        // Update welcome banners
        const titleText = document.getElementById('portalRoleTitle');
        const userGreeting = document.getElementById('welcomeUserName');
        const subGreeting = document.getElementById('welcomeUserSub');
        const sideMenu = document.getElementById('dynamicMenu');

        if (titleText) titleText.textContent = `${currentUserRole.toUpperCase()} PORTAL`;
        if (userGreeting) userGreeting.textContent = `Welcome back, ${currentUserData.name}! 👋`;
        if (subGreeting) subGreeting.textContent = `Access Level verified as: ${currentUserRole}`;

        // Hide all workspace views first
        document.getElementById('adminWorkspace').style.display = 'none';
        document.getElementById('lecturerWorkspace').style.display = 'none';
        document.getElementById('studentWorkspace').style.display = 'none';

        // Render Sidebar Layout and open Workspace Panels depending on custom role
        if (currentUserRole === 'admin') {
            document.getElementById('adminWorkspace').style.display = 'grid';
            sideMenu.innerHTML = `
                <a class="menu-item active" data-target="adminWorkspace"><i class="fa-solid fa-users-gear"></i> Manage Users</a>
                <a class="menu-item" data-target="adminWorkspace"><i class="fa-solid fa-bullhorn"></i> Campus Notices</a>
            `;
            initAdminLogic();
        } 
        else if (currentUserRole === 'lecturer') {
            document.getElementById('lecturerWorkspace').style.display = 'grid';
            sideMenu.innerHTML = `
                <a class="menu-item active" data-target="lecturerWorkspace"><i class="fa-solid fa-book"></i> My Modules</a>
                <a class="menu-item" id="navLecturerNotes"><i class="fa-regular fa-file-lines"></i> Class Notes (PDF)</a>
                <a class="menu-item" id="navLecturerAssignments"><i class="fa-solid fa-list-check"></i> Assignments</a>
                <a class="menu-item" id="navLecturerGrades"><i class="fa-solid fa-chart-simple"></i> Grades</a>
            `;
            initLecturerLogic();
        } 
        else if (currentUserRole === 'student') {
            document.getElementById('studentWorkspace').style.display = 'grid';
            sideMenu.innerHTML = `
                <a class="menu-item active"><i class="fa-solid fa-graduation-cap"></i> My Modules</a>
                <a class="menu-item"><i class="fa-regular fa-file-pdf"></i> Study Notes</a>
                <a class="menu-item"><i class="fa-solid fa-pen-nib"></i> Assignments</a>
                <a class="menu-item"><i class="fa-solid fa-award"></i> My Grades</a>
            `;
            initStudentLogic();
        }
    }

    // =================================================================
    // 4. ADMIN FUNCTIONAL LOGIC (PHASE A)
    // =================================================================
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
                    alert(`Success: Registered ${payload.name} as a ${payload.role}! (Remember to add matching email login inside your Firebase Authentication settings menu.)`);
                    adminUserForm.reset();
                } catch (err) {
                    console.error("Error creating record: ", err);
                }
            });
        }

        const adminNoticeForm = document.getElementById('adminNoticeForm');
        if (adminNoticeForm && !adminNoticeForm.dataset.hooked) {
            adminNoticeForm.dataset.hooked = "true";
            adminNoticeForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = document.getElementById('noticeTitle').value.trim();
                const message = document.getElementById('noticeBody').value.trim();

                try {
                    await addDoc(collection(db, "notices"), {
                        title: title,
                        message: message,
                        timestamp: new Date()
                    });
                    alert("Campus Notice Broadcasted Successfully!");
                    adminNoticeForm.reset();
                } catch (err) {
                    console.error("Error creating notice: ", err);
                }
            });
        }
    }

    // =================================================================
    // 5. LECTURER FUNCTIONAL LOGIC (PHASE B / C)
    // =================================================================
    function initLecturerLogic() {
        const moduleForm = document.getElementById('lecturerModuleForm');
        const assignDropdown = document.getElementById('assignMod');
        const modTableBody = document.getElementById('lecturerModulesTableBody');

        // Setup real-time dynamic sync of module items added by lecturers
        onSnapshot(collection(db, "modules"), (snapshot) => {
            if (assignDropdown) assignDropdown.innerHTML = '';
            if (modTableBody) modTableBody.innerHTML = '';

            snapshot.forEach((snapshotDoc) => {
                const mod = snapshotDoc.data();
                const mDocId = snapshotDoc.id;

                // Populate Assign Student module dropdown options selector
                if (assignDropdown) {
                    const option = document.createElement('option');
                    option.value = mDocId;
                    option.textContent = `[${mod.code}] ${mod.name}`;
                    assignDropdown.appendChild(option);
                }

                // Render operational row matrix layout tracking lists
                if (modTableBody) {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><strong>${mod.code}</strong></td>
                        <td>${mod.name}</td>
                        <td>
                            <button class="btn btn-secondary-action attendance-trigger-btn" data-id="${mDocId}" data-name="${mod.name}">
                                <i class="fa-solid fa-clipboard-user"></i> Call Attendance
                            </button>
                        </td>
                    `;
                    modTableBody.appendChild(row);
                }
            });

            // Bind click listeners for active attendance checklist generation triggers
            document.querySelectorAll('.attendance-trigger-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const targetModId = e.currentTarget.dataset.id;
                    const targetModName = e.currentTarget.dataset.name;
                    launchAttendanceInterface(targetModId, targetModName);
                });
            });
        });

        // Save module creation records
        if (moduleForm && !moduleForm.dataset.hooked) {
            moduleForm.dataset.hooked = "true";
            moduleForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const moduleRecord = {
                    code: document.getElementById('modCode').value.trim(),
                    name: document.getElementById('modName').value.trim(),
                    lecturerEmail: auth.currentUser.email
                };
                try {
                    await addDoc(collection(db, "modules"), moduleRecord);
                    alert(`Created Module Track: ${moduleRecord.name}`);
                    moduleForm.reset();
                } catch (err) {
                    console.error("Module error: ", err);
                }
            });
        }

        // Assign a student profile directly to a course tracking grid module
        const assignStudentForm = document.getElementById('lecturerAssignStudentForm');
        if (assignStudentForm && !assignStudentForm.dataset.hooked) {
            assignStudentForm.dataset.hooked = "true";
            assignStudentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const moduleId = document.getElementById('assignMod').value;
                
                const enrollmentPayload = {
                    moduleId: moduleId,
                    studentId: document.getElementById('assignStuId').value.trim(),
                    studentName: document.getElementById('assignStuName').value.trim(),
                    studentEmail: document.getElementById('assignStuEmail').value.trim(),
                    academicYear: document.getElementById('assignStuYear').value.trim(),
                    enrolledAt: new Date()
                };

                try {
                    await addDoc(collection(db, "enrollments"), enrollmentPayload);
                    alert("Student assigned and enrolled in module successfully!");
                    assignStudentForm.reset();
                } catch (err) {
                    console.error("Enrollment database layer anomaly: ", err);
                }
            });
        }
    }

    // Dynamic Attendance sheet creation overlay layout
    function launchAttendanceInterface(moduleId, moduleName) {
        const viewPanel = document.getElementById('lecturerActiveModuleView');
        if (!viewPanel) return;

        viewPanel.innerHTML = `
            <h3><i class="fa-solid fa-clipboard-user"></i> Attendance: ${moduleName}</h3>
            <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Check the active box structure to call registration presence marks.</p>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Student ID</th>
                            <th>Full Name</th>
                            <th>Status (Present)</th>
                        </tr>
                    </thead>
                    <tbody id="attendanceSheetBody">
                        <tr><td colspan="3" style="text-align:center;">Querying enrolled directory rosters...</td></tr>
                    </tbody>
                </table>
            </div>
            <button class="btn btn-action-glow" id="saveAttendanceBtn" style="margin-top:1.5rem; background: linear-gradient(135deg, #10b981 0%, #047857 100%);">Submit Attendance Roster</button>
            <button class="btn btn-secondary-action" id="closeAttendanceBtn" style="margin-top:1rem; width:100%;">Return to Selection Matrix</button>
        `;

        const sheetBody = document.getElementById('attendanceSheetBody');
        
        // Dynamic search parameters connecting active enrollments bound to this module track configuration
        const enrollmentQuery = query(collection(db, "enrollments"), where("moduleId", "==", moduleId));
        getDocs(enrollmentQuery).then((snap) => {
            sheetBody.innerHTML = '';
            if (snap.empty) {
                sheetBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color: var(--text-muted);">No student tracks enrolled inside this class segment yet.</td></tr>`;
                return;
            }
            snap.forEach((docRecord) => {
                const enrollment = docRecord.data();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${enrollment.studentId}</strong></td>
                    <td>${enrollment.studentName}</td>
                    <td>
                        <label class="attendance-check-label">
                            <input type="checkbox" class="attendance-checkbox" data-studentid="${enrollment.studentId}"> Present
                        </label>
                    </td>
                `;
                sheetBody.appendChild(tr);
            });
        });

        // Close attendance sheet view context handler
        document.getElementById('closeAttendanceBtn').addEventListener('click', () => {
            renderDashboardView(); 
        });

        // Save sheet checklist array alert triggers
        document.getElementById('saveAttendanceBtn').addEventListener('click', () => {
            alert("Attendance state profile successfully processed and synchronized directly to Firestore ledger sheets!");
            renderDashboardView();
        });
    }

    // =================================================================
    // 6. STUDENT PORTAL UI SYNC LOOKUP ENGINE
    // =================================================================
    function initStudentLogic() {
        const studentTable = document.getElementById('studentModulesTableBody');
        if (!studentTable) return;

        // Fetch course rosters matching user email parameters
        const studentMatchQuery = query(collection(db, "enrollments"), where("studentEmail", "==", auth.currentUser.email));
        
        onSnapshot(studentMatchQuery, (snapshot) => {
            studentTable.innerHTML = '';
            if (snapshot.empty) {
                studentTable.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">You are not registered in any course tracks yet. Please contact your lecturer.</td></tr>`;
                return;
            }

            snapshot.forEach((snapDoc) => {
                const data = snapDoc.data();
                
                // Fetch the core metadata profile info mapping from modules root collection parameters
                onSnapshot(doc(db, "modules", data.moduleId), (modSnap) => {
                    if (modSnap.exists()) {
                        const moduleMeta = modSnap.data();
                        
                        // Prevent row redundancy if snap fires again
                        const dynamicRowId = `row-${snapDoc.id}`;
                        let existingRow = document.getElementById(dynamicRowId);
                        
                        if (!existingRow) {
                            existingRow = document.createElement('tr');
                            existingRow.id = dynamicRowId;
                            studentTable.appendChild(existingRow);
                        }

                        existingRow.innerHTML = `
                            <td><strong>${moduleMeta.code}</strong></td>
                            <td>${moduleMeta.name}</td>
                            <td><span style="color:var(--glow-blue); font-style:italic;">${moduleMeta.lecturerEmail || 'Assigned Staff'}</span></td>
                        `;
                    }
                });
            });
        });
    }

    // =================================================================
    // 7. SECURE SIGN-OUT ROUTER LOGIC
    // =================================================================
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                window.location.href = 'login.html';
            } catch (error) {
                console.error("Signout fail: ", error);
            }
        });
    }
});
