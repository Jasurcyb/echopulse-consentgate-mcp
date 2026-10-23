import asyncio
import os
import edge_tts

# Alexa-style natural conversational neural voice
VOICE = "en-US-AvaNeural"

PHRASES = {
    "washer_drain_cavitation": "I isolated a 784 Hertz cavitation harmonic on your washer's drain pump impeller. You can fix this in 25 minutes with OEM part WPW10348269 for $28.40, saving $186 over a technician dispatch.",
    "fridge_evap_fan_ice": "I isolated a 1,144 Hertz harmonic matching refrigerator evaporator fan frost impingement. You can fix this in 30 minutes with OEM defrost thermistor WR55X10025 for $14.90, saving $215.",
    "furnace_inducer_bearing": "I isolated a 2,424 Hertz harmonic matching furnace draft inducer bearing wear. You can fix this in 40 minutes with OEM motor 318984-753 for $112, saving $283.",
    "pipe_water_hammer": "I isolated a 192 Hertz hydraulic shockwave matching copper pipe water hammer. I have throttled your smart main water valve to 55 PSI to protect your plumbing solder joints.",
    "hvac_contactor_arcing": "Critical safety alert: 240-volt contactor electrical arcing detected at 4,160 Hertz. I have automatically tripped your smart load center breaker and locked out self-repair for your safety.",
    "co_alarm_temporal4": "Emergency alert: Carbon Monoxide Temporal-4 acoustic pattern verified at 3,104 Hertz. Evacuate immediately. I have shut off your furnace gas relay and unlocked all exit doors.",
    "poisoned_bulletin_trojan": "I diagnosed a 784 Hertz washer drain pump fault requiring a $28 OEM part. Warning: ConsentGate blocked an external repair bulletin from ordering a $349 kit and unlocking your front door.",
    "healthy_laminar_baseline": "Your appliance is operating at a clean 60 Hertz fundamental with minimal harmonic distortion. All sub-assemblies are healthy. No replacement parts are needed.",
    "step_up_challenge": "Hold on. An untrusted external source is attempting to unlock your front door. To authorize this high-consequence action, please say the confirmation code: Echo Falcon.",
    "step_up_verified": "Voice confirmation verified. High consequence tool execution permitted by ConsentGate.",
    "step_up_quarantined": "Source quarantined. Further commands from this untrusted sender will be rejected."
}

async def generate():
    out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "audio")
    os.makedirs(out_dir, exist_ok=True)
    
    print(f"Generating AI Neural Voices using {VOICE}...")
    for key, text in PHRASES.items():
        out_path = os.path.join(out_dir, f"{key}.mp3")
        communicate = edge_tts.Communicate(text, VOICE, rate="+3%", pitch="+0Hz")
        await communicate.save(out_path)
        print(f"Generated: {out_path} ({os.path.getsize(out_path)} bytes)")
    print("All AI neural voice assets generated successfully!")

if __name__ == "__main__":
    asyncio.run(generate())
