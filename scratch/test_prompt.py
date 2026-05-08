from app.prompts.intake import INTAKE_PROMPT
import json

try:
    formatted = INTAKE_PROMPT.format(idea="test idea")
    print("Formatting successful!")
    print(formatted[-100:]) # Show last bit to confirm {idea} was replaced
except KeyError as e:
    print(f"Formatting failed with KeyError: {e}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")
