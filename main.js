document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const studentForm = document.getElementById('studentForm');
    const studentTableBody = document.getElementById('studentTableBody');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('errorMessage');

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const result = await response.json();
                
                if (result.success) {
                    window.location.href = result.redirect;
                } else {
                    errorDiv.textContent = result.message || 'Invalid credentials.';
                }
            } catch (err) {
                errorDiv.textContent = 'Server connection error.';
            }
        });
    }

    if (studentTableBody) {
        loadStudents();

        studentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentData = {
                studentId: document.getElementById('stuId').value,
                name: document.getElementById('stuName').value,
                course: document.getElementById('stuCourse').value,
                email: document.getElementById('stuEmail').value,
            };

            try {
                const response = await fetch('/api/students', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(studentData)
                });

                if (response.ok) {
                    studentForm.reset();
                    loadStudents();
                }
            } catch (err) {
                console.error(err);
            }
        });
    }

    async function loadStudents() {
        try {
            const response = await fetch('/api/students');
            const students = await response.json();
            studentTableBody.innerHTML = '';
            
            students.forEach(student => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${student.studentId}</td>
                    <td>${student.name}</td>
                    <td>${student.course}</td>
                    <td>${student.email}</td>
                    <td><button class="btn btn-danger" onclick="deleteStudent('${student._id}')">Remove</button></td>
                `;
                studentTableBody.appendChild(row);
            });
        } catch (err) {
            console.error(err);
        }
    }

    window.deleteStudent = async (id) => {
        if (confirm("Are you sure you want to remove this record?")) {
            await fetch(`/api/students/${id}`, { method: 'DELETE' });
            loadStudents();
        }
    };
});