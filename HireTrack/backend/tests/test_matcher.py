from app.ai.matcher import compute_match, extract_skills


def test_taxonomy_matches_whole_words_only(app):
    assert extract_skills("I know javascript") == {"javascript"}
    assert extract_skills("I know java") == {"java"}
    assert extract_skills("nosqlish") == set()


def test_skill_coverage_and_missing_when_resume_is_rich(app):
    resume = (
        "Python developer with Flask and SQL experience. Built REST APIs and used Docker daily. "
        "Strong communication skills, delivered projects on time across several teams and products "
        "for many years in production environments. Also maintained PostgreSQL schemas, wrote pytest "
        "suites for backend services, and worked closely with product managers and designers on "
        "reporting features for internal business users."
    )
    result = compute_match(resume, "Backend Engineer", "Python Flask Kubernetes AWS role.",
                           ["python", "flask", "kubernetes", "aws"])
    assert set(result["matched_skills"]) == {"python", "flask"}
    assert result["missing_skills"] == ["aws", "kubernetes"]
    assert result["unconfirmed_skills"] == []
    assert 0 <= result["score"] <= 100
    assert result["disclaimer"]


def test_thin_resume_marks_skills_unconfirmed_not_missing(app):
    result = compute_match("Python dev", "Backend Engineer", "Needs Python and AWS.", ["python", "aws"])
    assert result["missing_skills"] == []
    assert result["unconfirmed_skills"] == ["aws"]
    assert result["note"]


def test_empty_resume_scores_zero(app):
    assert compute_match("", "Title", "Some description text", [])["score"] == 0


def test_scores_are_deterministic(app):
    text = "Experienced Python and SQL engineer who builds data pipelines and dashboards for teams."
    a = compute_match(text, "Data Engineer", "Python SQL pipelines", ["python", "sql"])
    b = compute_match(text, "Data Engineer", "Python SQL pipelines", ["python", "sql"])
    assert a == b
