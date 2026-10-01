# -*- coding: utf-8 -*-
"""Deriva data.en.json de data.es.json: mismos números, etiquetas de categorías del banco en inglés."""
import json, os
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "engine")
d = json.load(open(os.path.join(R, "data.es.json"), encoding="utf-8"))
TR = {"Administrativo": "Administrative", "Obrero": "Blue-collar worker", "Técnico": "Technician", "Servicios": "Services", "Gerente": "Manager", "Jubilado": "Retired",
      "Empleado Independiente": "Self-employed", "Estudiante": "Student", "Emprendedor": "Entrepreneur", "Desempleado": "Unemployed", "Dueña de Casa": "Homemaker", "Desconocido": "Unknown",
      "Casado": "Married", "Soltero": "Single", "Divorciado": "Divorced", "Sin Educación": "No education", "Básica": "Primary", "Media": "Secondary", "Curso Profesional": "Professional course",
      "Grado Universitario": "University degree", "Si": "Yes", "No": "No"}
b = d["banco"]
b["ocupaciones"] = [TR.get(x, x) for x in b["ocupaciones"]]; b["civil"] = [TR.get(x, x) for x in b["civil"]]; b["educacion"] = [TR.get(x, x) for x in b["educacion"]]
b["conteos"] = {col: {TR.get(k, k): v for k, v in cnt.items()} for col, cnt in b["conteos"].items()}
json.dump(d, open(os.path.join(R, "data.en.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print("ok")
