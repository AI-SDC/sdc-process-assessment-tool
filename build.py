"""Build the standalone ontology assessment pages.

Inlines src/ontology.js (which loads the StatBarn SDC semantic model at runtime)
and each page script into its template, writing single-file HTML pages to dist/:

    python build.py
"""

from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
DIST = ROOT / "dist"

# (template, script, output)
PAGES = (
    ("template.html", "app.js", "ontology_assessment.html"),
    ("wizard_template.html", "wizard_app.js", "ontology_assessment_guided.html"),
)


def inline_script(name: str) -> str:
    """Read a script so it can sit inside a script tag."""
    return (SRC / name).read_text("utf-8").replace("</script", "<\\/script")


def main() -> None:
    """Generate the single-file HTML pages."""
    DIST.mkdir(exist_ok=True)
    (DIST / "index.html").write_text((SRC / "index.html").read_text("utf-8"), "utf-8")
    ontology = inline_script("ontology.js")
    for template, script, output in PAGES:
        html = (SRC / template).read_text("utf-8")
        html = html.replace("/*ONTOLOGY*/", ontology).replace(
            "/*SCRIPT*/", inline_script(script)
        )
        (DIST / output).write_text(html, "utf-8")
        print(f"wrote {DIST / output}")


if __name__ == "__main__":
    main()
