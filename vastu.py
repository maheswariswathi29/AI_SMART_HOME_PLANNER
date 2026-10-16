"""Traditional Vastu alignment rules used as optional design guidance."""


def check_vastu(entrance, kitchen, bedroom, pooja, bathroom):
    score = 100
    suggestions = []

    if entrance not in ["East", "North"]:
        score -= 10
        suggestions.append("Main entrance is traditionally preferred on the East or North side.")
    if kitchen != "South-East":
        score -= 15
        suggestions.append("A South-East kitchen is a common Vastu recommendation.")
    if bedroom != "South-West":
        score -= 10
        suggestions.append("A South-West master bedroom is a traditional Vastu preference.")
    if pooja != "North-East":
        score -= 10
        suggestions.append("A North-East pooja or quiet room is traditionally preferred.")
    if bathroom not in ["North-West", "West"]:
        score -= 15
        suggestions.append("North-West or West is a common traditional bathroom placement suggestion.")

    if score >= 90:
        suggestions.insert(0, "Your selected directions align with most of these traditional Vastu conventions.")
    elif score >= 70:
        suggestions.insert(0, "Your selected directions align with several traditional Vastu conventions.")
    else:
        suggestions.insert(0, "You may want to review some room directions against traditional Vastu preferences.")
    return max(0, score), suggestions
