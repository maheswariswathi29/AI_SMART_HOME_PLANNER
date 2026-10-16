from __future__ import annotations

from pathlib import Path
import re

import pandas as pd
from flask import Flask, render_template, request

from vastu import check_vastu


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "vizag_house_cost.csv"
app = Flask(__name__)


def format_inr(amount: int | float) -> str:
    """Format amounts with Indian digit grouping, e.g. 1,23,45,000."""
    number = str(int(round(amount)))
    if len(number) <= 3:
        return number
    last = number[-3:]
    prefix = number[:-3]
    groups = []
    while prefix:
        groups.append(prefix[-2:])
        prefix = prefix[:-2]
    return ",".join(reversed(groups)) + "," + last


app.jinja_env.globals["inr"] = format_inr


def _categories() -> dict[str, list[str]]:
    """Match the sorted LabelEncoder categories used by train_model.py."""
    data = pd.read_csv(DATA_PATH)
    columns = ["Location", "Material_Quality", "Interior_Type", "Parking", "Balcony", "Garden"]
    return {name: sorted(data[name].dropna().astype(str).unique().tolist()) for name in columns}


CATEGORIES = _categories()
LOCATIONS = CATEGORIES["Location"]

# Published Visakhapatnam neighbourhood benchmark bands (₹/sq ft), Q3 2026.
# Localities not individually priced by the source use its general Vizag band.
LOCATION_ZONE = {
    "MVP Colony": "MVP Colony / premium coast",
    "Seethammadhara": "Central established neighbourhoods",
    "Madhurawada": "Madhurawada / IT corridor",
    "Kommadi": "Kommadi / growth belt",
    "Gajuwaka": "Gajuwaka / value market",
    "Pendurthi": "Pendurthi / outer growth",
    "Anandapuram": "Anandapuram / outer growth",
}
RATE_BANDS = {
    "MVP Colony / premium coast": {"Basic": (1300, 1300), "Standard": (1650, 1950), "Premium": (2150, 2500)},
    "Central established neighbourhoods": {"Basic": (1200, 1200), "Standard": (1500, 1800), "Premium": (2000, 2350)},
    "Madhurawada / IT corridor": {"Basic": (1150, 1150), "Standard": (1450, 1750), "Premium": (1950, 2300)},
    "Kommadi / growth belt": {"Basic": (1100, 1100), "Standard": (1400, 1650), "Premium": (1850, 2150)},
    "Gajuwaka / value market": {"Basic": (1050, 1050), "Standard": (1350, 1600), "Premium": (1750, 2100)},
    "Pendurthi / outer growth": {"Basic": (1050, 1050), "Standard": (1350, 1550), "Premium": (1700, 2050)},
    "General Visakhapatnam benchmark": {"Basic": (1050, 1300), "Standard": (1350, 1750), "Premium": (1950, 2500)},
}


def _int(form, key: str, default: int, minimum: int, maximum: int) -> int:
    try:
        value = int(form.get(key, default))
    except (TypeError, ValueError):
        raise ValueError(f"Enter a whole number for {key.replace('_', ' ')}.")
    if not minimum <= value <= maximum:
        raise ValueError(f"{key.replace('_', ' ').title()} must be between {minimum} and {maximum}.")
    return value


def _choice(form, key: str, allowed: tuple[str, ...], default: str) -> str:
    value = form.get(key, default)
    if value not in allowed:
        raise ValueError(f"Please select a valid {key.replace('_', ' ')}.")
    return value


def _color(form, key: str, default: str) -> str:
    value = form.get(key, default)
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
        raise ValueError("Choose valid wall and accent colors.")
    return value.lower()


def _make_rooms(home: dict) -> list[dict]:
    split = home["floors"] == 2
    rooms = [{"name": "Living room", "type": "living", "area": round(home["area_sqft"] * .22), "floor": 1},
             {"name": "Kitchen", "type": "kitchen", "area": round(home["area_sqft"] * .11), "floor": 1}]
    bedrooms = []
    for i in range(home["bedrooms"]):
        floor = 1 if not split or i == 0 else 2
        bedroom = {"name": f"Bedroom {i + 1}", "type": "bedroom", "area": round(home["area_sqft"] * .12), "floor": floor}
        bedrooms.append(bedroom)
        rooms.append(bedroom)

    # One bathroom is paired with each bedroom before shared guest bathrooms.
    for i in range(home["bathrooms"]):
        if i < len(bedrooms):
            owner = bedrooms[i]
            rooms.append({"name": f"Bathroom {i + 1} · Ensuite", "type": "bath", "area": round(home["area_sqft"] * .045), "floor": owner["floor"], "attached_to": owner["name"], "bath_role": "ensuite"})
        else:
            rooms.append({"name": f"Bathroom {i + 1} · Common", "type": "bath", "area": round(home["area_sqft"] * .045), "floor": 1, "attached_to": "Living room", "bath_role": "common"})

    if home["balcony"]:
        rooms.append({"name": "Balcony", "type": "balcony", "area": home["balcony_area"] or round(home["area_sqft"] * .045), "floor": 2 if split else 1})
    if home["garden_area"] > 0:
        rooms.append({"name": "Garden", "type": "garden", "area": home["garden_area"], "floor": 1})
    if home["parking_spaces"] > 0:
        rooms.append({"name": "Parking", "type": "parking", "area": home["parking_area"], "floor": 1})
    if split and not any(room["floor"] == 2 and room["type"] != "balcony" for room in rooms):
        rooms.append({"name": "Upper lounge / landing", "type": "living", "area": round(home["area_sqft"] * .10), "floor": 2})
    return rooms


@app.get("/")
def home():
    return render_template("index.html", locations=LOCATIONS)


@app.post("/design")
def design():
    try:
        area_unit = _choice(request.form, "area_unit", ("sq ft", "sq m"), "sq ft")
        display_min, display_max = (74, 232) if area_unit == "sq m" else (800, 2500)
        area = _int(request.form, "area", 1500 if area_unit == "sq ft" else 140, display_min, display_max)
        factor = 10.7639 if area_unit == "sq m" else 1
        area_sqft = round(area * factor)
        if not 800 <= area_sqft <= 2500:
            raise ValueError("The cost model was trained for homes between 800 and 2,500 sq ft (about 74–232 sq m). Choose a value in that range for a useful estimate.")

        bedrooms = _int(request.form, "bedrooms", 3, 1, 4)
        bathrooms = _int(request.form, "bathrooms", 2, 1, 4)
        floors = _int(request.form, "floors", 1, 1, 2)
        parking_spaces = _int(request.form, "parking_spaces", 1, 0, 3)
        garden_area = round(_int(request.form, "garden_area", 0, 0, 20000) * factor)
        parking_area = round(_int(request.form, "parking_area", 250, 0, 5000) * factor)
        balcony_area = round(_int(request.form, "balcony_area", 0, 0, 2000) * factor)

        location = request.form.get("location", "")
        quality = _choice(request.form, "material_quality", tuple(CATEGORIES["Material_Quality"]), "Standard")
        interior_type = _choice(request.form, "interior_type", tuple(CATEGORIES["Interior_Type"]), "Modern")
        balcony_choice = _choice(request.form, "balcony", ("Yes", "No"), "No")
        balcony = balcony_choice == "Yes" or balcony_area > 0
        if balcony_choice == "Yes" and balcony_area == 0:
            balcony_area = round(area_sqft * .045)
        garden = garden_area > 0 or _choice(request.form, "garden", ("Yes", "No"), "No") == "Yes"
        if garden and garden_area == 0:
            garden_area = round(area_sqft * .12)
        parking = parking_spaces > 0
        if location not in LOCATIONS:
            raise ValueError("Please select a supported Visakhapatnam neighbourhood.")

        home_data = {
            "name": request.form.get("name", "").strip()[:60],
            "location": location,
            "area_sqft": area_sqft,
            "area_unit": area_unit,
            "area_display": area if area_unit == "sq m" else area_sqft,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "floors": floors,
            "balcony": balcony,
            "balcony_area": balcony_area,
            "garden": garden,
            "garden_area": garden_area,
            "parking": parking,
            "parking_spaces": parking_spaces,
            "parking_area": parking_area if parking else 0,
            "facing": _choice(request.form, "facing", ("North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"), "North"),
            "wall_color": _color(request.form, "wall_color", "#eee5d3"),
            "accent_color": _color(request.form, "accent_color", "#a8b4a1"),
            "palette_id": _choice(request.form, "palette_id", ("linen", "coastal", "clay", "dusk", "garden", "blush", "custom"), "linen"),
            "palette_name": _choice(request.form, "palette_name", ("Soft linen", "Coastal calm", "Clay & olive", "Evening dusk", "Garden room", "Blush & walnut", "Custom colours"), "Soft linen"),
            "material_quality": quality,
            "floor_material": _choice(request.form, "floor_material", ("Warm tile", "Wood-look plank", "Natural stone", "Polished concrete"), "Warm tile"),
            "wall_finish": _choice(request.form, "wall_finish", ("Smooth plaster", "Limewash", "Textured paint", "Exposed brick accent"), "Smooth plaster"),
            "roof_material": _choice(request.form, "roof_material", ("Concrete slab", "Pitched tile roof", "Metal standing seam"), "Concrete slab"),
            "window_material": _choice(request.form, "window_material", ("Aluminium", "Timber", "uPVC"), "Aluminium"),
            "interior_type": interior_type,
            "interior_style": _choice(request.form, "interior_style", ("Modern organic", "Scandinavian", "Warm contemporary", "Indian modern", "Japandi", "Classic home"), "Modern organic"),
            "furniture": _choice(request.form, "furniture", ("Comfortable", "Space-saving", "Statement pieces"), "Comfortable"),
            "planting": _choice(request.form, "planting", ("Low upkeep", "Lush & layered", "Edible garden"), "Low upkeep"),
            "entrance": _choice(request.form, "entrance", ("North", "East", "South", "West"), "North"),
            "kitchen_direction": _choice(request.form, "kitchen_direction", ("South-East", "North-West", "North-East", "West", "East", "South"), "South-East"),
            "bedroom_direction": _choice(request.form, "bedroom_direction", ("South-West", "North", "East", "West", "South", "North-West"), "South-West"),
            "pooja_direction": _choice(request.form, "pooja_direction", ("North-East", "East", "West", "South", "North", "South-West"), "North-East"),
            "bathroom_direction": _choice(request.form, "bathroom_direction", ("North-West", "West", "North-East", "South-East", "South", "East"), "North-West"),
        }

        estimate = None
        cost_range = None
        cost_rate = None
        cost_band = None
        cost_zone = LOCATION_ZONE.get(location, "General Visakhapatnam benchmark")
        model_note = ""
        low_rate, high_rate = RATE_BANDS[cost_zone][quality]
        cost_band = (low_rate, high_rate)
        cost_rate = round((low_rate + high_rate) / 2)
        estimate = round(area_sqft * cost_rate)
        cost_range = (area_sqft * low_rate, area_sqft * high_rate)
        model_note = (f"Planning estimate for {location}, using the {cost_zone} {quality.lower()} rate band. "
                      "Built-up area includes all floors combined. This published benchmark covers typical construction, labour and standard finishes; it excludes land, loose interior furnishings, compound walls, approvals and site-specific soil/slope work. The rate source was published in Q3 2026; confirm current prices and site conditions with local contractors before budgeting.")

        score, suggestions = check_vastu(
            home_data["entrance"], home_data["kitchen_direction"],
            home_data["bedroom_direction"], home_data["pooja_direction"],
            home_data["bathroom_direction"],
        )
        area_per_bedroom = area_sqft / bedrooms
        if area_per_bedroom < 300:
            suggestions.append("With this home size and bedroom count, keep circulation compact and preserve clear paths between shared rooms.")
        else:
            suggestions.append("Your requested area leaves room to plan comfortable circulation around the shared and private spaces.")
        if garden_area:
            suggestions.append("Your garden area is included in the design brief; consider keeping planting clear of daylight and access routes.")
        result = {
            "home": home_data,
            "rooms": _make_rooms(home_data),
            "score": score,
            "suggestions": suggestions,
            "estimate": estimate,
            "cost_range": cost_range,
            "cost_rate": cost_rate,
            "cost_band": cost_band,
            "cost_zone": cost_zone,
            "model_note": model_note,
        }
        return render_template("result.html", **result)
    except ValueError as error:
        return render_template("index.html", locations=LOCATIONS, error=str(error)), 400


if __name__ == "__main__":
    app.run(debug=True)
