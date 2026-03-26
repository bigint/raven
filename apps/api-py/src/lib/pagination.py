from dataclasses import dataclass
from typing import Any


@dataclass
class PaginatedResult:
    data: list[Any]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_previous: bool


def paginate(total: int, page: int, page_size: int, data: list[Any]) -> PaginatedResult:
    return PaginatedResult(
        data=data,
        total=total,
        page=page,
        page_size=page_size,
        has_next=(page * page_size) < total,
        has_previous=page > 1,
    )
