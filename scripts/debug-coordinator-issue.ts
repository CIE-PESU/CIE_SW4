// Debug script to check coordinator assignments and component domains
import { prisma } from '../lib/prisma'

async function debugCoordinatorIssue() {
  try {
    console.log("=== DEBUGGING COORDINATOR ISSUE ===\n")

    // 1. Check all domains
    console.log("1. All Domains:")
    const domains = await prisma.domain.findMany()
    console.log(domains.map(d => ({ id: d.id, name: d.name })))
    console.log("")

    // 2. Check all coordinator assignments
    console.log("2. All Coordinator Assignments:")
    const coordinators = await prisma.domainCoordinator.findMany({
      include: {
        domain: true,
        faculty: {
          include: { user: true }
        }
      }
    })
    
    console.log(coordinators.map(c => ({
      id: c.id,
      domain_name: c.domain.name,
      faculty_name: c.faculty.user.name,
      domain_id: c.domain_id,
      faculty_id: c.faculty_id
    })))
    console.log("")

    // 3. Check components and their domain assignments
    console.log("3. Lab Components with Domain Assignments:")
    const components = await prisma.labComponent.findMany({
      include: {
        domain: true
      },
      take: 10 // Just show first 10
    })
    
    console.log(components.map(c => ({
      id: c.id,
      name: c.component_name,
      domain_id: c.domain_id,
      domain_name: c.domain?.name || "NO DOMAIN ASSIGNED"
    })))
    console.log("")

    // 4. Find components without domain assignments
    console.log("4. Components WITHOUT Domain Assignments:")
    const componentsWithoutDomain = await prisma.labComponent.findMany({
      where: {
        domain_id: null
      }
    })
    
    console.log(`Found ${componentsWithoutDomain.length} components without domain assignments`)
    if (componentsWithoutDomain.length > 0) {
      console.log("First 5:")
      console.log(componentsWithoutDomain.slice(0, 5).map(c => ({
        id: c.id,
        name: c.component_name
      })))
    }
    console.log("")

    // 5. Test coordinator lookup for each component with domain
    console.log("5. Testing Coordinator Lookup for Components:")
    const componentsWithDomain = components.filter(c => c.domain_id)
    
    for (const component of componentsWithDomain.slice(0, 5)) {
      const coordinator = await prisma.domainCoordinator.findFirst({
        where: { domain_id: component.domain_id! },
        include: {
          faculty: {
            include: { user: true }
          }
        }
      })
      
      console.log(`Component "${component.component_name}" (domain: ${component.domain?.name}):`)
      if (coordinator) {
        console.log(`  ✅ Coordinator found: ${coordinator.faculty.user.name}`)
      } else {
        console.log(`  ❌ NO COORDINATOR FOUND!`)
      }
    }

  } catch (error) {
    console.error("Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

debugCoordinatorIssue()
