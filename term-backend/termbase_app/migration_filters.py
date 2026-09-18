def include_managed_object(object_, name, type_, reflected, compare_to):
    """Limit Alembic autogeneration to the normalized knowledge schema."""
    if type_ == "table":
        return bool(name and name.startswith("kb_"))

    table = getattr(object_, "table", None)
    if table is not None:
        return table.name.startswith("kb_")

    return True
