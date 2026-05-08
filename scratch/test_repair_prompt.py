from app.routers.chat import INTAKE_JSON_REPAIR_PROMPT

try:
    formatted = INTAKE_JSON_REPAIR_PROMPT.format(raw="some raw content")
    print("Repair prompt formatting successful!")
except KeyError as e:
    print(f"Repair prompt formatting failed with KeyError: {e}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")
