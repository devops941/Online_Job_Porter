import re

from fastapi import Depends, APIRouter, HTTPException

from app.auth import require_admin
from app.database.client import db
from app.utils.text import safe_term
from app.schemas import CategoryIn, CategoryOut, Message, SkillIn, SkillOut

router = APIRouter(prefix="/api", tags=["Categories & Skills"])


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


# ---------- Categories ----------
@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(activeOnly: bool = True):
    where = {"isActive": True} if activeOnly else {}
    return await db.category.find_many(where=where, order={"name": "asc"})


@router.post("/categories", response_model=CategoryOut, status_code=201, dependencies=[Depends(require_admin)])
async def create_category(payload: CategoryIn):
    slug = slugify(payload.name)
    if await db.category.find_first(where={"slug": slug}):
        raise HTTPException(status_code=409, detail="Category already exists")
    data = payload.model_dump()
    return await db.category.create(data={**data, "slug": slug})


@router.put("/categories/{category_id}", response_model=CategoryOut, dependencies=[Depends(require_admin)])
async def update_category(category_id: str, payload: CategoryIn):
    existing = await db.category.find_unique(where={"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    data = payload.model_dump(exclude_unset=True)
    if payload.name:
        data["slug"] = slugify(payload.name)
    return await db.category.update(where={"id": category_id}, data=data)


@router.delete("/categories/{category_id}", response_model=Message, dependencies=[Depends(require_admin)])
async def delete_category(category_id: str):
    existing = await db.category.find_unique(where={"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    in_use = await db.job.count(where={"categoryId": category_id})
    if in_use:
        # Deactivating keeps existing postings valid instead of orphaning them.
        await db.category.update(where={"id": category_id}, data={"isActive": False})
        return Message(detail=f"Category deactivated (used by {in_use} job postings)")
    await db.category.delete(where={"id": category_id})
    return Message(detail="Category deleted")


# ---------- Skills ----------
@router.get("/skills", response_model=list[SkillOut])
async def list_skills(q: str | None = None, limit: int = 200):
    where = {}
    if q:
        where["name"] = {"contains": safe_term(q), "mode": "insensitive"}
    return await db.skill.find_many(where=where, take=limit, order={"name": "asc"})


@router.post("/skills", response_model=SkillOut, status_code=201, dependencies=[Depends(require_admin)])
async def create_skill(payload: SkillIn):
    existing = await db.skill.find_first(where={"name": payload.name})
    if existing:
        return existing
    return await db.skill.create(data=payload.model_dump())


@router.delete("/skills/{skill_id}", response_model=Message, dependencies=[Depends(require_admin)])
async def delete_skill(skill_id: str):
    existing = await db.skill.find_unique(where={"id": skill_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Skill not found")
    await db.skill.delete(where={"id": skill_id})
    return Message(detail="Skill deleted")
