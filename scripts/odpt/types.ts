export interface OdptBusstopPole {
  'owl:sameAs': string
  'dc:title': string
  'geo:lat'?: number
  'geo:long'?: number
}

export interface OdptBusroutePatternStopOrder {
  'odpt:index': number
  'odpt:busstopPole': string
}

export interface OdptBusroutePattern {
  'owl:sameAs': string
  'odpt:busroute': string
  'odpt:direction': string
  'odpt:busstopPoleOrder': OdptBusroutePatternStopOrder[]
}

export interface OdptBusTimetableObject {
  'odpt:index': number
  'odpt:busstopPole': string
  'odpt:arrivalTime'?: string
  'odpt:departureTime'?: string
  'odpt:destinationSign'?: string
}

export interface OdptBusTimetable {
  'owl:sameAs': string
  'dc:date'?: string
  'dc:title'?: string
  'odpt:calendar': string
  'odpt:busroutePattern': string
  'odpt:busTimetableObject': OdptBusTimetableObject[]
}
