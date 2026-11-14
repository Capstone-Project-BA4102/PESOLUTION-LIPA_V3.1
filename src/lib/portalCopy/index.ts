/**
 * Portal copy barrel: importing this module registers every dictionary and
 * re-exports the translation hooks, so any screen can simply call usePT().
 */
import './chrome'
import './analytics'
import './applicant'
import './adminOps'
import './adminCatalog'
import './adminMatch'
import './superadmin'

export * from './core'
