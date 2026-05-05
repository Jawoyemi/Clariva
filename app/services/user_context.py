def build_user_context(owner) -> str:
    if not owner or owner.get("type") != "user":
        return ""

    user = owner["data"]
    parts = []
    if user.company_name:
        parts.append(f"Company: {user.company_name}")
    if user.role:
        parts.append(f"Role/title: {user.role}")
    if user.industry:
        parts.append(f"Industry: {user.industry}")
    if user.preferred_tone:
        parts.append(f"Preferred document tone: {user.preferred_tone}")

    return "\n".join(parts)
