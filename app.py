from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import os

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'fines-system-secret-key-2024')

basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'fines.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Models
class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)

class Section(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    students = db.relationship('Student', backref='section', lazy=True)

class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    gender = db.Column(db.String(20), nullable=False)
    fine = db.Column(db.Float, default=0)
    status = db.Column(db.String(20), default='unpaid')
    section_id = db.Column(db.Integer, db.ForeignKey('section.id'), nullable=False)

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Initialize database
def init_db():
    with app.app_context():
        db.create_all()
        # Create default admin if not exists
        if not Admin.query.filter_by(username='admin').first():
            admin = Admin(
                username='admin',
                password_hash=generate_password_hash('admin123')
            )
            db.session.add(admin)
            
            # Create default section
            section = Section(name='BSIS-1A')
            db.session.add(section)
            db.session.commit()

# Routes
@app.route('/')
def index():
    if 'admin_id' in session:
        return render_template('index.html')
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        admin = Admin.query.filter_by(username=username).first()
        if admin and check_password_hash(admin.password_hash, password):
            session['admin_id'] = admin.id
            return redirect(url_for('index'))
        
        return render_template('login.html', error='Invalid credentials')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('admin_id', None)
    return redirect(url_for('login'))

# API Routes
@app.route('/api/sections', methods=['GET', 'POST'])
@login_required
def sections():
    if request.method == 'GET':
        sections = Section.query.all()
        return jsonify([{'id': s.id, 'name': s.name} for s in sections])
    
    if request.method == 'POST':
        data = request.json
        if Section.query.filter_by(name=data['name']).first():
            return jsonify({'error': 'Section already exists'}), 400
        
        section = Section(name=data['name'])
        db.session.add(section)
        db.session.commit()
        return jsonify({'id': section.id, 'name': section.name})

@app.route('/api/students', methods=['GET'])
@login_required
def get_students():
    section_id = request.args.get('section_id')
    if section_id:
        students = Student.query.filter_by(section_id=section_id).all()
    else:
        students = Student.query.all()
    
    return jsonify([{
        'id': s.id,
        'name': s.name,
        'gender': s.gender,
        'fine': s.fine,
        'status': s.status,
        'section_id': s.section_id
    } for s in students])

@app.route('/api/students', methods=['POST'])
@login_required
def add_student():
    data = request.json
    section = Section.query.get(data.get('section_id'))
    if not section:
        return jsonify({'error': 'Section not found'}), 404
    
    student = Student(
        name=data['name'],
        gender=data['gender'],
        fine=data.get('fine', 0),
        status=data.get('status', 'unpaid'),
        section_id=section.id
    )
    db.session.add(student)
    db.session.commit()
    
    return jsonify({
        'id': student.id,
        'name': student.name,
        'gender': student.gender,
        'fine': student.fine,
        'status': student.status,
        'section_id': student.section_id
    })

@app.route('/api/students/<int:student_id>', methods=['PUT'])
@login_required
def update_student(student_id):
    student = Student.query.get(student_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    
    data = request.json
    if 'name' in data:
        student.name = data['name']
    if 'gender' in data:
        student.gender = data['gender']
    if 'fine' in data:
        student.fine = data['fine']
    if 'status' in data:
        student.status = data['status']
    
    db.session.commit()
    
    return jsonify({
        'id': student.id,
        'name': student.name,
        'gender': student.gender,
        'fine': student.fine,
        'status': student.status,
        'section_id': student.section_id
    })

@app.route('/api/students/<int:student_id>', methods=['DELETE'])
@login_required
def delete_student(student_id):
    student = Student.query.get(student_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    
    db.session.delete(student)
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/stats')
@login_required
def stats():
    section_id = request.args.get('section_id')
    if section_id:
        students = Student.query.filter_by(section_id=section_id).all()
    else:
        students = Student.query.all()
    
    total = len(students)
    total_fines = sum(s.fine for s in students)
    avg_fine = total_fines / total if total > 0 else 0
    highest = max((s.fine for s in students), default=0)
    paid = len([s for s in students if s.status == 'paid'])
    unpaid = total - paid
    
    return jsonify({
        'totalStudents': total,
        'totalFines': total_fines,
        'avgFine': avg_fine,
        'highestFine': highest,
        'paid': paid,
        'unpaid': unpaid
    })

@app.route('/api/export/<int:section_id>')
@login_required
def export_csv(section_id):
    import csv
    from flask import Response
    
    section = Section.query.get(section_id)
    students = Student.query.filter_by(section_id=section_id).all()
    
    response = Response(
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment;filename=fines_{section.name}.csv'}
    )
    
    writer = csv.writer(response)
    writer.writerow(['Name', 'Gender', 'Fine', 'Status'])
    for s in students:
        writer.writerow([s.name, s.gender, s.fine, s.status])
    
    return response

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)