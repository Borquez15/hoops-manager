# 🤖 Integración de Gemini AI para Generación de Calendarios

## 📋 Resumen

Este documento describe cómo integrar **Google Gemini AI** para mejorar la generación automática de calendarios de torneos en Hoops Manager.

---

## 🎯 Objetivos de la Integración

1. **Optimización inteligente** de calendarios considerando:
   - Distribución equitativa de partidos
   - Evitar sobrecarga de equipos en días consecutivos
   - Balancear uso de canchas
   - Considerar preferencias horarias

2. **Regeneración automática** cuando se modifican equipos
3. **Resolución de conflictos** de horarios
4. **Sugerencias de mejora** para calendarios existentes

---

## 🛠️ Implementación Recomendada

### 1. Backend: Crear Servicio de IA

Crear un nuevo archivo `app/services/gemini_service.py`:

```python
import google.generativeai as genai
from typing import List, Dict
import os
from datetime import datetime, timedelta

class GeminiSchedulerService:
    def __init__(self):
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel('gemini-1.5-pro')

    async def generate_smart_schedule(
        self,
        teams: List[Dict],
        courts: List[Dict],
        config: Dict
    ) -> Dict:
        """
        Genera un calendario optimizado usando Gemini AI

        Args:
            teams: Lista de equipos con sus jugadores
            courts: Canchas disponibles
            config: Configuración del torneo (vueltas, playoffs, horarios)

        Returns:
            Dict con el calendario generado y recomendaciones
        """

        prompt = self._build_prompt(teams, courts, config)

        try:
            response = await self.model.generate_content_async(prompt)
            schedule_data = self._parse_ai_response(response.text)

            return {
                "schedule": schedule_data,
                "suggestions": schedule_data.get("suggestions", []),
                "conflicts": schedule_data.get("conflicts", [])
            }
        except Exception as e:
            # Fallback to traditional algorithm
            return await self._traditional_scheduling(teams, courts, config)

    def _build_prompt(self, teams, courts, config) -> str:
        """Construye el prompt para Gemini"""
        return f"""
Eres un experto en planificación de torneos deportivos.

DATOS DEL TORNEO:
- Equipos: {len(teams)} equipos
- Canchas: {len(courts)} canchas disponibles
- Modalidad: {config['modalidad']}
- Vueltas: {config['vueltas']}
- Playoffs: {config['cupos_playoffs']} equipos clasifican
- Horario: {config['hora_ini']} - {config['hora_fin']}
- Días por semana: {config['dias_por_semana']}
- Partidos por día: {config['partidos_por_dia']}
- Duración de partido: {config['slot_min']} minutos

EQUIPOS:
{self._format_teams(teams)}

CANCHAS:
{self._format_courts(courts)}

OBJETIVO:
Genera un calendario óptimo que:
1. Todos los equipos jueguen el mismo número de partidos
2. Ningún equipo juegue 2 días consecutivos
3. Distribuye equitativamente el uso de canchas
4. Evita que un equipo juegue muy temprano o muy tarde siempre
5. Maximiza descansos entre partidos para cada equipo

FORMATO DE RESPUESTA (JSON):
{{
    "partidos": [
        {{
            "fecha": "YYYY-MM-DD",
            "hora": "HH:MM",
            "cancha_id": 1,
            "equipo_local_id": 1,
            "equipo_visitante_id": 2,
            "jornada": 1
        }}
    ],
    "suggestions": [
        "Sugerencia 1",
        "Sugerencia 2"
    ],
    "conflicts": []
}}
"""

    def _format_teams(self, teams) -> str:
        """Formatea la lista de equipos"""
        return "\n".join([
            f"- {team['nombre']} (ID: {team['id_equipo']}, {len(team.get('jugadores', []))} jugadores)"
            for team in teams
        ])

    def _format_courts(self, courts) -> str:
        """Formatea la lista de canchas"""
        return "\n".join([
            f"- {court['nombre']} ({court['ubicacion']})"
            for court in courts
        ])

    async def suggest_improvements(self, current_schedule: List[Dict]) -> List[str]:
        """
        Analiza un calendario existente y sugiere mejoras
        """
        prompt = f"""
Analiza el siguiente calendario de torneo y sugiere mejoras:

CALENDARIO ACTUAL:
{self._format_schedule(current_schedule)}

Proporciona 3-5 sugerencias específicas para mejorar este calendario.
Responde en formato JSON:
{{
    "suggestions": [
        "sugerencia 1",
        "sugerencia 2"
    ]
}}
"""

        response = await self.model.generate_content_async(prompt)
        return self._parse_suggestions(response.text)
```

### 2. Endpoint de API

Agregar en `app/routers/tournaments.py`:

```python
from app.services.gemini_service import GeminiSchedulerService

@router.post("/{tournament_id}/schedule/ai")
async def generate_ai_schedule(
    tournament_id: int,
    use_ai: bool = True,
    db: Session = Depends(get_db)
):
    """
    Genera calendario usando IA o algoritmo tradicional
    """
    gemini_service = GeminiSchedulerService()

    # Obtener datos del torneo
    tournament = db.query(Tournament).filter(Tournament.id_torneo == tournament_id).first()
    teams = db.query(Equipo).filter(Equipo.id_torneo == tournament_id).all()
    courts = db.query(Cancha).filter(Cancha.id_torneo == tournament_id).all()

    if use_ai:
        result = await gemini_service.generate_smart_schedule(
            teams=[t.__dict__ for t in teams],
            courts=[c.__dict__ for c in courts],
            config=tournament.__dict__
        )
    else:
        # Usar algoritmo tradicional
        result = await traditional_scheduling(tournament, teams, courts)

    # Guardar partidos en la base de datos
    save_matches(db, tournament_id, result["schedule"])

    return {
        "success": True,
        "matches_created": len(result["schedule"]),
        "suggestions": result.get("suggestions", []),
        "conflicts": result.get("conflicts", [])
    }

@router.get("/{tournament_id}/schedule/suggestions")
async def get_schedule_suggestions(
    tournament_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtiene sugerencias de mejora para el calendario actual
    """
    gemini_service = GeminiSchedulerService()

    matches = db.query(Match).filter(Match.id_torneo == tournament_id).all()

    suggestions = await gemini_service.suggest_improvements(
        [m.__dict__ for m in matches]
    )

    return {
        "suggestions": suggestions
    }
```

### 3. Frontend: Actualizar Componente

Modificar `tournament-detail.component.ts`:

```typescript
async generateCalendar(): Promise<void> {
  const minimumTeams = this.getMinimumTeams();

  if (this.equipos.length < minimumTeams) {
    alert(`⚠️ Necesitas al menos ${minimumTeams} equipos`);
    return;
  }

  // Preguntar si quiere usar IA
  const useAI = confirm(
    '🤖 ¿Quieres usar IA (Gemini) para generar un calendario optimizado?\n\n' +
    '✅ Con IA: Calendario más equilibrado y eficiente\n' +
    '⏱️ Sin IA: Generación tradicional más rápida\n\n' +
    'Presiona OK para usar IA'
  );

  try {
    this.generatingCalendar = true;

    const response = await this.http.post<any>(
      `${this.apiUrl}/tournaments/${this.tournamentId}/schedule/ai`,
      { use_ai: useAI }
    ).toPromise();

    this.calendarGenerated = true;
    this.generatingCalendar = false;

    // Mostrar sugerencias de la IA
    if (response.suggestions && response.suggestions.length > 0) {
      const suggestions = response.suggestions.join('\n\n');
      alert(
        `✅ Calendario generado exitosamente!\n\n` +
        `📊 Sugerencias de optimización:\n\n${suggestions}`
      );
    }

    // Cargar vista previa
    await this.loadCalendarPreview();

  } catch (error) {
    console.error('❌ Error al generar calendario:', error);
    this.generatingCalendar = false;
    alert('❌ Error al generar calendario');
  }
}
```

---

## 🔧 Configuración

### 1. Obtener API Key de Gemini

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crea un proyecto nuevo
3. Genera una API Key
4. Guarda la key en tu `.env`:

```bash
GEMINI_API_KEY=tu_api_key_aqui
```

### 2. Instalar Dependencias

```bash
pip install google-generativeai
```

### 3. Variables de Entorno

Agregar en `.env`:

```
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-1.5-pro
USE_AI_SCHEDULING=true
```

---

## 📊 Ventajas de Usar Gemini AI

### ✅ Ventajas

1. **Optimización Superior**: Gemini puede considerar múltiples variables simultáneamente
2. **Aprendizaje**: Puede mejorar con el feedback de calendarios anteriores
3. **Flexibilidad**: Fácil agregar nuevas restricciones mediante prompts
4. **Resolución de Conflictos**: Detecta y resuelve problemas automáticamente

### ⚠️ Consideraciones

1. **Costo**: API de Gemini tiene costos por uso
2. **Latencia**: Puede tardar más que el algoritmo tradicional
3. **Dependencia Externa**: Requiere conexión a internet
4. **Rate Limits**: Límites de requests por minuto

---

## 🚀 Mejoras Futuras

1. **Preferencias de Equipos**: Permitir que equipos elijan horarios preferidos
2. **Historial de Partidos**: Evitar repetir enfrentamientos recientes
3. **Condiciones Climáticas**: Integrar con APIs meteorológicas
4. **Análisis de Rendimiento**: Sugerir horarios según estadísticas de equipos
5. **Chat con IA**: Permitir al usuario hacer preguntas sobre el calendario

---

## 📝 Ejemplo de Uso

```typescript
// Generar calendario con IA
const result = await this.geminiService.generateCalendar({
  tournamentId: 123,
  teams: [...],
  courts: [...],
  preferences: {
    avoidBackToBack: true,
    balanceHomeAway: true,
    preferWeekends: true
  }
});

// Mostrar resultados
console.log('Partidos creados:', result.matches.length);
console.log('Sugerencias:', result.suggestions);
```

---

## 🔒 Seguridad

1. **Nunca exponer** la API Key en el frontend
2. **Validar** todas las respuestas de la IA
3. **Tener fallback** al algoritmo tradicional si falla la IA
4. **Sanitizar** datos antes de enviarlos a Gemini
5. **Limitar** el número de requests por usuario

---

## 📞 Soporte

Para preguntas sobre la integración:
- Documentación de Gemini: https://ai.google.dev/docs
- GitHub Issues: https://github.com/tu-repo/hoops-manager/issues

---

**Última actualización**: 2025-01-13
**Versión**: 1.0.0
