import re

_REGEX_SPECIAL = re.compile(r"([.^$*+?{}\[\]\\|()])")


def escape_regex(value: str) -> str:
    """Escape user input before it is embedded in a Prisma `contains` filter.

    Prisma compiles `contains` to a MongoDB $regex, so raw input such as
    `') ; DROP TABLE users; --` would otherwise fail to compile the pattern
    (and crash the request) rather than simply matching nothing.
    """
    if not value:
        return value
    return _REGEX_SPECIAL.sub(r"\\\1", value)


def safe_term(value: str | None) -> str | None:
    return escape_regex(value) if value else value
