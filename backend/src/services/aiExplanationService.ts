// Google AI (Gemini) Integration for Safety Explanations
// Provides AI-powered natural language safety explanations
// Based on research.md: Use Gemini API for natural language safety explanations

import {
  SafetyScore,
  SafetyFactor,
  Route,
  Location,
  CrimeData,
  AIExplanationRequest,
  AIExplanationResponse,
  SafetyRecommendation
} from '../types/index.js';

interface GeminiRequest {
  contents: {
    parts: {
      text: string;
    }[];
  }[];
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
  };
  safetySettings?: {
    category: string;
    threshold: string;
  }[];
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
    finishReason: string;
    safetyRatings: {
      category: string;
      probability: string;
    }[];
  }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class AIExplanationService {
  private apiKey: string;
  private geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

  constructor() {
    this.apiKey = process.env.GOOGLE_AI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Google AI API key not found in environment variables');
    }
  }

  /**
   * Generate AI-powered safety explanation for a location
   * @param request Safety explanation request
   * @returns Detailed safety explanation with recommendations
   */
  public async generateSafetyExplanation(request: AIExplanationRequest): Promise<AIExplanationResponse> {
    try {
      const { safetyScore, location, crimeData, timeContext } = request;

      // Build context-rich prompt for Gemini
      const prompt = this.buildSafetyExplanationPrompt(
        safetyScore,
        location,
        crimeData,
        timeContext
      );

      // Generate explanation using Gemini
      const explanation = await this.callGeminiApi(prompt, {
        temperature: 0.3, // Lower temperature for more consistent safety advice
        maxOutputTokens: 400
      });

      // Generate actionable recommendations
      const recommendations = this.enhanceRecommendationsWithAI(
        safetyScore,
        explanation,
        timeContext
      );

      return {
        explanation,
        recommendations,
        confidence: this.calculateExplanationConfidence(safetyScore, crimeData),
        generatedAt: new Date(),
        metadata: {
          promptTokens: 0, // Would be filled by actual API response
          responseTokens: 0,
          model: 'gemini-1.5-flash-latest',
          temperature: 0.3
        }
      };

    } catch (error: any) {
      console.error('AI explanation generation failed:', error);

      // Fallback to rule-based explanation
      return this.generateFallbackExplanation(request);
    }
  }

  /**
   * Generate AI-enhanced route safety explanation
   * @param route Route with safety scores
   * @param alternatives Alternative routes for comparison
   * @returns Comprehensive route safety analysis
   */
  public async generateRouteSafetyExplanation(
    route: Route,
    alternatives?: Route[]
  ): Promise<string> {
    try {
      const prompt = this.buildRouteExplanationPrompt(route, alternatives);

      const explanation = await this.callGeminiApi(prompt, {
        temperature: 0.4,
        maxOutputTokens: 300
      });

      return explanation;

    } catch (error: any) {
      console.error('Route explanation generation failed:', error);
      return this.generateFallbackRouteExplanation(route);
    }
  }

  /**
   * Generate AI-powered safety tips based on context
   * @param location Current location
   * @param timeContext Time and environmental context
   * @param userProfile User preferences and history
   * @returns Personalized safety recommendations
   */
  public async generateContextualSafetyTips(
    location: Location,
    timeContext?: any,
    userProfile?: any
  ): Promise<SafetyRecommendation[]> {
    try {
      const prompt = this.buildSafetyTipsPrompt(location, timeContext, userProfile);

      const tipsText = await this.callGeminiApi(prompt, {
        temperature: 0.5,
        maxOutputTokens: 500
      });

      // Parse AI response into structured recommendations
      return this.parseSafetyTipsResponse(tipsText);

    } catch (error: any) {
      console.error('Safety tips generation failed:', error);
      return this.generateBasicSafetyTips(location, timeContext);
    }
  }

  /**
   * Build comprehensive safety explanation prompt
   */
  private buildSafetyExplanationPrompt(
    safetyScore: SafetyScore,
    location: Location,
    crimeData?: CrimeData,
    timeContext?: any
  ): string {
    const timeInfo = timeContext?.currentTime
      ? new Date(timeContext.currentTime).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })
      : 'current time';

    const crimeInfo = crimeData ? `
Crime statistics for this area show:
- Risk level: ${crimeData.riskLevel}
- Historical incidents: ${crimeData.crimeStats.map(stat => `${stat.type} (${stat.incidentCount} incidents)`).join(', ')}
- Population density: ${crimeData.populationDensity} people/km²
- Economic indicators: Income level ${crimeData.economicIndicators.averageIncome}, ${crimeData.economicIndicators.businessDensity} businesses/km²
` : '';

    const prompt = `As a safety expert familiar with Cape Town, South Africa, provide a clear, practical explanation of the safety conditions for this location.

Location: ${location.address || `${location.latitude}, ${location.longitude}`}
Neighborhood: ${location.neighborhood || 'Unknown area'}
Time context: ${timeInfo}

Safety Score Breakdown:
- Overall Safety: ${safetyScore.overall}/100
- Crime Risk: ${safetyScore.crimeRisk}/100
- Time Factor: ${safetyScore.timeFactor}/100
- Population Density: ${safetyScore.populationDensity}/100
- Lighting Level: ${safetyScore.lightingLevel}/100
- Historical Incidents: ${safetyScore.historicalIncidents}

${crimeInfo}

Safety Factors:
${safetyScore.factors.map(factor =>
  `- ${factor.type}: ${factor.value}/100 (${factor.impact} impact) - ${factor.description}`
).join('\n')}

Please provide:
1. A 2-3 sentence summary of the overall safety situation
2. Key safety factors (positive and negative) affecting this location
3. Specific considerations for the current time/context
4. Brief practical advice for staying safe in this area

Keep the explanation factual, helpful, and relevant to Cape Town context. Avoid overly alarming language while being honest about risks.`;

    return prompt;
  }

  /**
   * Build route safety explanation prompt
   */
  private buildRouteExplanationPrompt(route: Route, alternatives?: Route[]): string {
    const segmentSummary = route.segments.length > 3
      ? `${route.segments.length} segments with safety scores ranging from ${Math.min(...route.segments.map(s => s.safetyScore.overall))} to ${Math.max(...route.segments.map(s => s.safetyScore.overall))}`
      : route.segments.map((seg, i) => `Segment ${i+1}: ${seg.safetyScore.overall}/100`).join(', ');

    const alternativeInfo = alternatives ? `
Alternative routes available:
${alternatives.map((alt, i) =>
  `Route ${i+2}: ${alt.safetyScore.overall}/100 safety, ${Math.round(alt.estimatedDuration/60)} min, ${Math.round(alt.totalDistance/1000)}km`
).join('\n')}
` : '';

    const prompt = `As a Cape Town navigation expert, explain the safety characteristics of this route.

Route Details:
- Overall Safety Score: ${route.safetyScore.overall}/100
- Distance: ${Math.round(route.totalDistance/1000)}km
- Duration: ${Math.round(route.estimatedDuration/60)} minutes
- Segments: ${segmentSummary}
- Route Type: Rank ${route.alternativeRank} ${route.alternativeRank === 1 ? '(fastest)' : route.alternativeRank === 2 ? '(balanced)' : '(safest)'}

${alternativeInfo}

Most concerning segment:
${(() => {
  const worstSegment = route.segments.reduce((worst, seg) =>
    seg.safetyScore.overall < worst.safetyScore.overall ? seg : worst
  );
  return `${worstSegment.startLocation.address} to ${worstSegment.endLocation.address}: ${worstSegment.safetyScore.overall}/100 safety, ${worstSegment.roadType} road`;
})()}

Provide a concise 2-3 sentence explanation focusing on:
1. Overall route safety assessment
2. Any areas requiring special attention
3. How this route compares to alternatives (if available)

Keep it practical and Cape Town-specific.`;

    return prompt;
  }

  /**
   * Build safety tips prompt
   */
  private buildSafetyTipsPrompt(
    location: Location,
    timeContext?: any,
    userProfile?: any
  ): string {
    const timeInfo = timeContext?.currentTime
      ? new Date(timeContext.currentTime).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })
      : 'daytime';

    const travelMode = userProfile?.preferredTravelMode || 'walking';

    const prompt = `As a Cape Town safety expert, provide 3-4 specific safety tips for someone ${travelMode} in this area.

Location: ${location.address || location.neighborhood || 'Cape Town area'}
Time: ${timeInfo}
Travel mode: ${travelMode}

Focus on:
- Practical, actionable advice
- Cape Town-specific considerations
- Time-appropriate recommendations
- ${travelMode}-specific safety measures

Format as numbered list with brief explanations. Keep each tip to 1-2 sentences.`;

    return prompt;
  }

  /**
   * Call Google Gemini API with retry logic
   */
  private async callGeminiApi(
    prompt: string,
    config: { temperature?: number; maxOutputTokens?: number } = {}
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Google AI API key not available');
    }

    const request: GeminiRequest = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: config.temperature || 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: config.maxOutputTokens || 300
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    const response = await fetch(`${this.geminiApiUrl}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);

      if (response.status === 403) {
        throw new Error('PERMISSION_DENIED: Check Google AI API key and permissions');
      } else if (response.status === 429) {
        throw new Error('QUOTA_EXCEEDED: Google AI API quota exceeded');
      } else {
        throw new Error(`Gemini API error: ${response.status}`);
      }
    }

    const data: GeminiResponse = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    const candidate = data.candidates[0];
    if (candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
      throw new Error(`Gemini response incomplete: ${candidate.finishReason}`);
    }

    return candidate.content.parts[0].text.trim();
  }

  /**
   * Enhance recommendations with AI insights
   */
  private enhanceRecommendationsWithAI(
    safetyScore: SafetyScore,
    explanation: string,
    timeContext?: any
  ): SafetyRecommendation[] {
    const baseRecommendations: SafetyRecommendation[] = [];

    // Add AI-enhanced recommendations based on explanation content
    if (explanation.toLowerCase().includes('avoid') || safetyScore.overall < 40) {
      baseRecommendations.push({
        type: 'route_change',
        priority: 'high',
        description: 'Consider alternative route based on current safety assessment',
        actionable: true,
        estimatedImprovement: 25,
        aiGenerated: true
      });
    }

    if (explanation.toLowerCase().includes('night') || explanation.toLowerCase().includes('lighting')) {
      baseRecommendations.push({
        type: 'precaution',
        priority: 'medium',
        description: 'Ensure adequate lighting/visibility for safety',
        actionable: true,
        estimatedImprovement: 15,
        aiGenerated: true
      });
    }

    if (explanation.toLowerCase().includes('group') || explanation.toLowerCase().includes('alone')) {
      baseRecommendations.push({
        type: 'alert_contact',
        priority: 'medium',
        description: 'Travel with others when possible or share location with trusted contacts',
        actionable: true,
        estimatedImprovement: 20,
        aiGenerated: true
      });
    }

    return baseRecommendations;
  }

  /**
   * Calculate confidence in AI explanation
   */
  private calculateExplanationConfidence(safetyScore: SafetyScore, crimeData?: CrimeData): number {
    let confidence = 70; // Base AI confidence

    // Higher confidence with more data
    if (crimeData) confidence += 15;
    if (safetyScore.factors.length >= 4) confidence += 10;
    if (safetyScore.confidenceLevel > 80) confidence += 15;

    // Lower confidence for edge cases
    if (safetyScore.overall < 20 || safetyScore.overall > 95) confidence -= 10;

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Parse AI safety tips response into structured recommendations
   */
  private parseSafetyTipsResponse(tipsText: string): SafetyRecommendation[] {
    const recommendations: SafetyRecommendation[] = [];

    // Simple parsing of numbered list format
    const lines = tipsText.split('\n').filter(line => line.trim());

    lines.forEach((line, index) => {
      if (/^\d+\./.test(line.trim())) {
        const description = line.replace(/^\d+\.\s*/, '').trim();

        recommendations.push({
          type: 'precaution',
          priority: index === 0 ? 'high' : 'medium',
          description,
          actionable: true,
          estimatedImprovement: 10,
          aiGenerated: true
        });
      }
    });

    return recommendations;
  }

  /**
   * Generate fallback explanation when AI fails
   */
  private generateFallbackExplanation(request: AIExplanationRequest): AIExplanationResponse {
    const { safetyScore, location } = request;

    let explanation = '';
    if (safetyScore.overall >= 75) {
      explanation = 'This area shows good safety indicators with acceptable risk levels.';
    } else if (safetyScore.overall >= 50) {
      explanation = 'This area has moderate safety with some areas of concern.';
    } else {
      explanation = 'This area has notable safety risks requiring extra caution.';
    }

    // Add factor-based details
    const concerns = safetyScore.factors.filter(f => f.impact === 'negative');
    if (concerns.length > 0) {
      explanation += ` Main concerns include ${concerns[0].description.toLowerCase()}.`;
    }

    return {
      explanation,
      recommendations: [{
        type: 'precaution',
        priority: 'medium',
        description: 'Stay alert and follow general safety practices',
        actionable: true,
        estimatedImprovement: 10
      }],
      confidence: 50,
      generatedAt: new Date(),
      metadata: {
        promptTokens: 0,
        responseTokens: 0,
        model: 'fallback',
        temperature: 0
      }
    };
  }

  /**
   * Generate fallback route explanation
   */
  private generateFallbackRouteExplanation(route: Route): string {
    const avgSafety = route.safetyScore.overall;

    if (avgSafety >= 75) {
      return `Route shows generally good safety levels across ${route.segments.length} segments with minimal risk factors.`;
    } else if (avgSafety >= 50) {
      return `Route has moderate safety levels with some segments requiring caution.`;
    } else {
      return `Route includes areas with safety concerns - consider alternatives if available.`;
    }
  }

  /**
   * Generate basic safety tips without AI
   */
  private generateBasicSafetyTips(
    location: Location,
    timeContext?: any
  ): SafetyRecommendation[] {
    const tips: SafetyRecommendation[] = [
      {
        type: 'precaution',
        priority: 'high',
        description: 'Stay aware of your surroundings and trust your instincts',
        actionable: true,
        estimatedImprovement: 15
      },
      {
        type: 'precaution',
        priority: 'medium',
        description: 'Keep valuables secure and avoid displaying expensive items',
        actionable: true,
        estimatedImprovement: 10
      }
    ];

    const isNightTime = timeContext?.currentTime &&
      (new Date(timeContext.currentTime).getHours() < 6 ||
       new Date(timeContext.currentTime).getHours() >= 19);

    if (isNightTime) {
      tips.push({
        type: 'precaution',
        priority: 'high',
        description: 'Use well-lit routes and consider travelling with others after dark',
        actionable: true,
        estimatedImprovement: 20
      });
    }

    return tips;
  }
}

export default AIExplanationService;