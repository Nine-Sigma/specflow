"""Data processing script."""


def transform_data(data: list) -> list:
    """Transform raw data into processed format."""
    return [{"value": item, "processed": True} for item in data]


def filter_valid(items: list) -> list:
    """Filter items that are valid."""
    return [item for item in items if item.get("processed")]
