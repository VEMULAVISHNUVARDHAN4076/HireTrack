from app.routes import admin, applications, auth, jobs, notifications, profile, resumes, ai


def register_blueprints(app):
    for module in (auth, profile, resumes, jobs, applications, ai, notifications, admin):
        app.register_blueprint(module.bp)
