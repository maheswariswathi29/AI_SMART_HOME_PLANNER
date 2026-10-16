import pandas as pd
import random


# Vizag Locations

locations = [
    "Gajuwaka",
    "Madhurawada",
    "MVP Colony",
    "Seethammadhara",
    "Pendurthi",
    "Kommadi",
    "Anandapuram",
    "Bheemili",
    "Tagarapuvalasa",
    "Sabbavaram",
    "Parawada",
    "Padmanabham",
    "Rambilli",
    "Atchutapuram",
    "Kothavalasa"
]


# Location cost factor

location_factor = {

    "Gajuwaka":1.10,
    "Madhurawada":1.15,
    "MVP Colony":1.20,
    "Seethammadhara":1.20,
    "Pendurthi":1.05,

    "Kommadi":1.05,
    "Anandapuram":1.00,
    "Bheemili":1.00,
    "Tagarapuvalasa":0.95,
    "Sabbavaram":0.90,

    "Parawada":0.90,
    "Padmanabham":0.85,
    "Rambilli":0.85,
    "Atchutapuram":0.90,
    "Kothavalasa":0.90
}


# Construction rate

quality_rate = {

    "Basic":1600,
    "Standard":2000,
    "Premium":2700

}


data = []


# Generate 1000 records

for i in range(1000):

    location = random.choice(locations)

    area = random.choice(
        [800,1000,1200,1500,1800,2000,2500]
    )


    bedrooms = random.choice(
        [1,2,3,4]
    )


    bathrooms = random.choice(
        [1,2,3,4]
    )


    floors = random.choice(
        [1,1,1,2]
    )


    quality = random.choice(
        ["Basic","Standard","Premium"]
    )


    interior = random.choice(
        ["Normal","Modern","Luxury"]
    )


    parking = random.choice(
        ["Yes","No"]
    )


    balcony = random.choice(
        ["Yes","No"]
    )


    garden = random.choice(
        ["Yes","No"]
    )


    # Cost Calculation

    total_cost = (
        area *
        quality_rate[quality]
    )


    # Location impact

    total_cost = (
        total_cost *
        location_factor[location]
    )


    # Floor cost

    if floors == 2:
        total_cost += 500000


    # Interior cost

    if interior == "Modern":
        total_cost += 200000

    elif interior == "Luxury":
        total_cost += 500000


    # Extra facilities

    if parking == "Yes":
        total_cost += 200000


    if garden == "Yes":
        total_cost += 100000



    material_cost = total_cost * 0.55
    labour_cost = total_cost * 0.25
    finishing_cost = total_cost * 0.20



    data.append([

        location,
        area,
        bedrooms,
        bathrooms,
        floors,
        quality,
        interior,
        parking,
        balcony,
        garden,
        round(material_cost),
        round(labour_cost),
        round(finishing_cost),
        round(total_cost)

    ])



# Create DataFrame

columns = [

    "Location",
    "Area_sqft",
    "Bedrooms",
    "Bathrooms",
    "Floors",
    "Material_Quality",
    "Interior_Type",
    "Parking",
    "Balcony",
    "Garden",
    "Material_Cost",
    "Labour_Cost",
    "Finishing_Cost",
    "Total_Cost"

]


df = pd.DataFrame(
    data,
    columns=columns
)



# Save CSV file

df.to_csv(
    "vizag_house_cost.csv",
    index=False
)



print("Dataset Created Successfully!")
print("Total Records:", len(df))

print("\nSample Data:")
print(df.head())
