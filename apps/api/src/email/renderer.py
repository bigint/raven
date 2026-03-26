from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from mjml import mjml2html

_env = Environment(
    loader=FileSystemLoader(Path(__file__).parent / "templates"),
    autoescape=select_autoescape(["mjml"]),
)


def render_template(template_name: str, **context: object) -> str:
    template = _env.get_template(template_name)
    mjml_str = template.render(**context)
    return mjml2html(mjml_str)
