using { sd as my } from '../db/schema';

@path: '/service/SolutionAdvisorSvcs'
@requires: 'authenticated-user'
service solutionAdvisorService {
  
  // Projects entity - NOT draft-enabled to avoid composition conflict
  entity Projects as projection on my.ProjectConfiguration;
  
  // Analyses entity - draft-enabled for user workflow
  @odata.draft.enabled
  entity Analyses as projection on my.CleanCoreAnalysis;
  
}
