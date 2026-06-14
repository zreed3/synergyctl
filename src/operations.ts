import type { GuardLevel, OperationDefinition, ParamDefinition } from "./types.js";

const pageLimit: ParamDefinition[] = [
  { name: "page", description: "Page number to return.", type: "number" },
  { name: "limit", description: "Maximum results to return.", type: "number" }
];

const domainName: ParamDefinition = {
  name: "domainName",
  description: "Domain name to action.",
  positional: true,
  required: true
};

const identifier: ParamDefinition = {
  name: "identifier",
  description: "Service, client, or subscription identifier.",
  positional: true,
  required: true
};

const certID: ParamDefinition = {
  name: "certID",
  description: "SSL certificate ID.",
  positional: true,
  required: true
};

const bodyParam: ParamDefinition = {
  name: "body",
  flag: "--body <json-or-file>",
  description: "Additional request body as JSON or @file.json.",
  type: "json"
};

const dryConfirm: ParamDefinition[] = [
  { name: "dryRun", flag: "--dry-run", description: "Preview the SOAP payload without making a live API call.", type: "boolean" },
  { name: "confirm", flag: "--confirm <token>", description: "Required confirmation token for live guarded writes." }
];

function op(input: Omit<OperationDefinition, "params"> & { params?: ParamDefinition[] }): OperationDefinition {
  return {
    params: input.params ?? [],
    ...input
  };
}

function read(
  group: OperationDefinition["group"],
  path: string[],
  command: string,
  operation: string,
  summary: string,
  params: ParamDefinition[] = [],
  extra: Partial<OperationDefinition> = {}
): OperationDefinition {
  return op({ group, path, command, operation, summary, kind: "read", guard: "none", params, ...extra });
}

function write(
  group: OperationDefinition["group"],
  path: string[],
  command: string,
  operation: string,
  summary: string,
  guard: GuardLevel,
  params: ParamDefinition[] = [],
  extra: Partial<OperationDefinition> = {}
): OperationDefinition {
  return op({
    group,
    path,
    command,
    operation,
    summary,
    kind: "write",
    guard,
    params: [...params, ...dryConfirm],
    ...extra
  });
}

export const OPERATIONS: OperationDefinition[] = [
  read("account", [], "balance", "balanceQuery", "Return the reseller account balance."),

  read("domains", [], "info <domainName>", "domainInfo", "Return information for one domain.", [domainName], {
    resourceParams: ["domainName"],
    includeSecrets: ["domainPassword"]
  }),
  read("domains", [], "bulk-info", "bulkDomainInfo", "Return information for multiple domains.", [
    { name: "domainList", flag: "--domain-list <domains>", description: "Comma-separated or JSON array of domain names.", required: true, type: "array" },
    { name: "limit", description: "Maximum results to return.", type: "number" }
  ]),
  write("domains", ["password"], "update <domainName>", "updateDomainPassword", "Update a domain EPP/AuthInfo password.", "credential", [
    domainName,
    { name: "password", flag: "--password <password>", description: "New domain password.", required: true, secret: true }
  ], { resourceParams: ["domainName"] }),
  read("domains", [], "check <domainName>", "checkDomain", "Check domain availability.", [
    domainName,
    { name: "command", description: "Pricing command: create, transfer, renew, or restore." },
    { name: "years", description: "Number of years for pricing.", type: "number" }
  ]),
  read("domains", [], "list", "listDomains", "List domains in the reseller account.", [
    ...pageLimit,
    { name: "status", description: "Filter by one domain status." }
  ], { includeSecrets: ["domainPassword"] }),
  read("domains", [], "bulk-check", "bulkCheckDomain", "Check availability for up to 30 domains.", [
    { name: "domainList", flag: "--domain-list <domains>", description: "Comma-separated or JSON array of domain names.", required: true, type: "array" },
    { name: "command", description: "Pricing command: create, transfer, renew, or restore." },
    { name: "years", description: "Number of years for pricing.", type: "number" }
  ]),
  read("domains", ["pricing"], "get <extension>", "getDomainPricing", "Get domain pricing for an extension.", [
    { name: "extension", description: "Domain extension, such as com.au.", positional: true, required: true },
    { name: "command", description: "Pricing command: create, transfer, renew, or restore." },
    { name: "years", description: "Number of years.", type: "number" }
  ]),
  write("domains", [], "register <domainName>", "domainRegister", "Register a domain using a JSON body for contact and eligibility details.", "billable", [
    domainName,
    bodyParam
  ], { resourceParams: ["domainName"] }),
  write("domains", [], "transfer <domainName>", "transferDomain", "Transfer a domain using a JSON body for auth and contact details.", "billable", [
    domainName,
    bodyParam
  ], { resourceParams: ["domainName"] }),
  read("domains", [], "transferrable <domainName>", "isDomainTransferrable", "Check whether a domain can be transferred.", [domainName]),
  write("domains", ["transfers"], "resend-email <domainName>", "resendTransferEmail", "Resend transfer approval email.", "email", [domainName], {
    resourceParams: ["domainName"]
  }),
  write("domains", ["transfers"], "cancel <domainName>", "transferCancel", "Cancel an inbound transfer.", "service", [domainName], {
    resourceParams: ["domainName"]
  }),
  write("domains", ["transfers"], "approve-outbound <domainName>", "transferOutboundApprove", "Approve an outbound transfer.", "service", [domainName], {
    resourceParams: ["domainName"]
  }),
  write("domains", ["transfers"], "reject-outbound <domainName>", "transferReject", "Reject an outbound transfer.", "service", [domainName], {
    resourceParams: ["domainName"]
  }),
  write("domains", [], "renew <domainName>", "renewDomain", "Renew a domain.", "billable", [
    domainName,
    { name: "years", description: "Years to renew.", type: "number" },
    bodyParam
  ], { resourceParams: ["domainName"] }),
  write("domains", [], "restore <domainName>", "restoreDomain", "Restore a domain from redemption when supported.", "billable", [
    domainName,
    bodyParam
  ], { resourceParams: ["domainName"] }),
  write("domains", ["nameservers"], "update <domainName>", "updateNameServers", "Update domain name servers.", "service", [
    domainName,
    { name: "dnsConfig", description: "DNS configuration ID." },
    { name: "nameServers", flag: "--name-servers <servers>", description: "Comma-separated or JSON array of name servers.", type: "array" },
    { name: "skipDefaultARecords", flag: "--skip-default-a-records", description: "Skip default A records when supported.", type: "boolean" }
  ], { resourceParams: ["domainName"] }),
  write("domains", ["contacts"], "update <domainName>", "updateContact", "Update domain contact details from a JSON body.", "service", [
    domainName,
    bodyParam
  ], { resourceParams: ["domainName"] }),
  write("domains", ["contacts"], "resend-update-emails <domainName>", "resendRegistrantUpdateEmails", "Resend registrant update emails.", "email", [domainName], {
    resourceParams: ["domainName"]
  }),
  write("domains", ["contacts"], "cancel-update <domainName>", "cancelRegistrantUpdate", "Cancel a pending registrant update.", "service", [domainName], {
    resourceParams: ["domainName"]
  }),
  read("domains", ["contacts"], "list <domainName>", "listContacts", "List domain contacts.", [domainName]),
  read("domains", ["contacts"], "protected", "listProtectedContacts", "List ID-protected contacts."),
  read("domains", ["contacts"], "raw <domainName>", "rawDomainContacts", "Return raw domain contacts.", [domainName]),
  write("domains", ["hosts"], "add <hostName>", "addHost", "Add a registry host.", "service", [
    { name: "hostName", description: "Registry host name.", positional: true, required: true },
    { name: "ipAddresses", flag: "--ip-addresses <addresses>", description: "Comma-separated or JSON array of IP addresses.", type: "array" }
  ], { resourceParams: ["hostName"] }),
  write("domains", ["hosts"], "delete <hostName>", "deleteHost", "Delete a registry host.", "destructive", [
    { name: "hostName", description: "Registry host name.", positional: true, required: true }
  ], { resourceParams: ["hostName"] }),
  write("domains", ["hosts"], "add-ip <hostName>", "addHostIP", "Add an IP address to a registry host.", "service", [
    { name: "hostName", description: "Registry host name.", positional: true, required: true },
    { name: "ipAddresses", flag: "--ip-addresses <addresses>", description: "Comma-separated or JSON array of IP addresses.", required: true, type: "array" }
  ], { resourceParams: ["hostName"] }),
  write("domains", ["hosts"], "delete-ip <hostName>", "deleteHostIP", "Delete an IP address from a registry host.", "service", [
    { name: "hostName", description: "Registry host name.", positional: true, required: true },
    { name: "ipAddresses", flag: "--ip-addresses <addresses>", description: "Comma-separated or JSON array of IP addresses.", required: true, type: "array" }
  ], { resourceParams: ["hostName"] }),
  read("domains", ["hosts"], "get <hostName>", "listHost", "Get registry host information.", [
    { name: "hostName", description: "Registry host name.", positional: true, required: true }
  ]),
  read("domains", ["hosts"], "list", "listAllHosts", "List registry hosts."),
  write("domains", [], "lock <domainName>", "lockDomain", "Enable transfer lock.", "service", [domainName], { resourceParams: ["domainName"] }),
  write("domains", [], "unlock <domainName>", "unlockDomain", "Disable transfer lock.", "service", [domainName], { resourceParams: ["domainName"] }),
  read("domains", ["renewal"], "required <domainName>", "domainRenewRequired", "Check whether renewal is required.", [domainName]),
  read("domains", ["renewal"], "max-years <domainName>", "maxYearsCanRenewFor", "Get maximum renewal years.", [domainName]),
  read("domains", ["extensions"], "list", "listAvailableDomainExtensions", "List available domain extensions."),
  write("domains", ["xxx"], "membership <domainName>", "updateXXXMembershipDetails", "Update .XXX membership details.", "service", [
    domainName,
    bodyParam
  ], { resourceParams: ["domainName"] }),
  read("domains", ["us"], "nexus", "getUSNexusData", "Retrieve .US nexus data."),
  write("domains", ["au"], "initiate-cor <domainName>", "initiateAUCOR", "Initiate .au change of registrant.", "billable", [
    domainName,
    bodyParam
  ], { resourceParams: ["domainName"] }),
  write("domains", ["au"], "cancel-cor <domainName>", "cancelChangeOfRegistrant", "Cancel a change of registrant request.", "service", [domainName], {
    resourceParams: ["domainName"]
  }),
  read("domains", ["eligibility"], "fields <extension>", "getDomainEligibilityFields", "Get eligibility fields for an extension.", [
    { name: "extension", description: "Domain extension.", positional: true, required: true },
    { name: "type", description: "Eligibility request type." }
  ]),
  read("domains", ["business"], "check <number>", "businessCheckRegistration", "Look up ABN/ACN/RBN information.", [
    { name: "number", description: "Business number.", positional: true, required: true }
  ]),
  read("domains", ["au"], "generate-eligibility <number>", "generateAuEligibility", "Generate .au eligibility details from business number.", [
    { name: "number", description: "Business number.", positional: true, required: true },
    { name: "type", description: "Business number type." }
  ]),
  read("domains", ["categories"], "list", "listDomainCategories", "List domain categories."),
  write("domains", ["categories"], "create", "createDomainCategory", "Create a domain category.", "service", [bodyParam], {
    resourceParams: ["name"]
  }),
  write("domains", ["categories"], "update <id>", "updateDomainCategory", "Update a domain category.", "service", [
    { name: "id", description: "Category ID.", positional: true, required: true },
    bodyParam
  ], { resourceParams: ["id"] }),
  write("domains", ["categories"], "remove <id>", "removeDomainCategory", "Remove a domain category.", "destructive", [
    { name: "id", description: "Category ID.", positional: true, required: true }
  ], { resourceParams: ["id"] }),
  write("domains", ["categories"], "assign <domainName> <id>", "assignDomainCategory", "Assign a category to a domain.", "service", [
    domainName,
    { name: "id", description: "Category ID.", positional: true, required: true }
  ], { resourceParams: ["domainName"] }),
  write("domains", ["categories"], "unassign <domainName> <id>", "unassignDomainCategory", "Unassign a category from a domain.", "service", [
    domainName,
    { name: "id", description: "Category ID.", positional: true, required: true }
  ], { resourceParams: ["domainName"] }),
  write("domains", ["correction"], "initiate <domainName>", "initiateCorrection", "Initiate domain registrant correction.", "service", [
    domainName,
    bodyParam
  ], { resourceParams: ["domainName"] }),
  read("domains", ["correction"], "check <domainName>", "checkCorrection", "Check pending domain registrant correction.", [domainName]),
  write("domains", ["correction"], "resend-email <domainName>", "resendCorrectionEmail", "Resend domain registrant correction email.", "email", [domainName], {
    resourceParams: ["domainName"]
  }),

  write("dns", ["zones"], "add <domainName>", "addDNSZone", "Add a DNS zone.", "service", [domainName], { resourceParams: ["domainName"] }),
  write("dns", ["zones"], "delete <domainName>", "deleteDNSZone", "Delete a DNS zone.", "destructive", [domainName], { resourceParams: ["domainName"] }),
  write("dns", ["records"], "add <domainName>", "addDNSRecord", "Add a DNS record.", "service", [
    domainName,
    bodyParam
  ], { resourceParams: ["domainName"] }),
  write("dns", ["records"], "update <domainName> <recordID>", "updateDNSRecord", "Update a DNS record.", "service", [
    domainName,
    { name: "recordID", description: "DNS record ID.", positional: true, required: true },
    bodyParam
  ], { resourceParams: ["recordID"] }),
  write("dns", ["records"], "delete <domainName> <recordID>", "deleteDNSRecord", "Delete a DNS record.", "destructive", [
    domainName,
    { name: "recordID", description: "DNS record ID.", positional: true, required: true }
  ], { resourceParams: ["recordID"] }),
  read("dns", ["records"], "get <domainName> <recordID>", "getDNSRecord", "Get a DNS record.", [
    domainName,
    { name: "recordID", description: "DNS record ID.", positional: true, required: true }
  ]),
  read("dns", ["records"], "list <domainName>", "listDNSZone", "List DNS zone records.", [domainName]),
  write("dns", ["mail-forwards"], "add <domainName>", "addMailForward", "Add an email forward.", "service", [domainName, bodyParam], {
    resourceParams: ["domainName"]
  }),
  write("dns", ["mail-forwards"], "delete <domainName>", "deleteMailForward", "Delete an email forward.", "destructive", [domainName, bodyParam], {
    resourceParams: ["domainName"]
  }),
  read("dns", ["mail-forwards"], "list <domainName>", "listMailForwards", "List email forwards.", [domainName]),
  write("dns", ["url-forwards"], "add <domainName>", "addSimpleURLForward", "Add a simple URL forward.", "service", [domainName, bodyParam], {
    resourceParams: ["domainName"]
  }),
  write("dns", ["url-forwards"], "delete <domainName>", "deleteSimpleURLForward", "Delete a simple URL forward.", "destructive", [domainName, bodyParam], {
    resourceParams: ["domainName"]
  }),
  read("dns", ["url-forwards"], "list <domainName>", "getSimpleURLForwards", "List simple URL forwards.", [domainName]),
  write("dns", ["id-protection"], "enable <domainName>", "enableIDProtection", "Enable ID privacy protection.", "billable", [domainName], {
    resourceParams: ["domainName"]
  }),
  write("dns", ["id-protection"], "disable <domainName>", "disableIDProtection", "Disable ID privacy protection.", "service", [domainName], {
    resourceParams: ["domainName"]
  }),
  write("domains", ["auto-renew"], "enable <domainName>", "enableAutoRenewal", "Enable automatic renewal.", "billable", [domainName], {
    resourceParams: ["domainName"]
  }),
  write("domains", ["auto-renew"], "disable <domainName>", "disableAutoRenewal", "Disable automatic renewal.", "service", [domainName], {
    resourceParams: ["domainName"]
  }),
  write("dns", ["dnssec"], "add-ds <domainName>", "DNSSECAddDS", "Add DNSSEC DS data.", "service", [domainName, bodyParam], {
    resourceParams: ["domainName"]
  }),
  write("dns", ["dnssec"], "remove-ds <domainName>", "DNSSECRemoveDS", "Remove DNSSEC DS data.", "service", [domainName, bodyParam], {
    resourceParams: ["domainName"]
  }),
  read("dns", ["dnssec"], "list-ds <domainName>", "DNSSECListDS", "List DNSSEC DS entries.", [domainName]),

  read("hosting", [], "list", "listHosting", "List hosting services.", [
    ...pageLimit,
    { name: "status", description: "Filter by hosting status." }
  ], { includeSecrets: ["password"] }),
  read("hosting", [], "get <identifier>", "hostingGetService", "Get hosting or email hosting service.", [identifier], {
    resourceParams: ["identifier"],
    includeSecrets: ["password"]
  }),
  read("hosting", [], "bulk-info", "bulkHostingInfo", "Get hosting information for multiple HO-IDs.", [
    { name: "hoidList", flag: "--hoid-list <ids>", description: "Comma-separated or JSON array of HO-IDs.", required: true, type: "array" },
    { name: "limit", description: "Maximum results to return.", type: "number" }
  ], { includeSecrets: ["password"] }),
  write("hosting", [], "purchase", "hostingPurchaseService", "Purchase a web or email hosting service.", "billable", [bodyParam], {
    resourceParams: ["domain"]
  }),
  write("hosting", [], "suspend <identifier>", "hostingSuspendService", "Suspend a hosting service.", "service", [identifier], {
    resourceParams: ["identifier"]
  }),
  write("hosting", [], "unsuspend <identifier>", "hostingUnsuspendService", "Unsuspend a hosting service.", "service", [identifier], {
    resourceParams: ["identifier"]
  }),
  read("hosting", ["packages"], "list", "hostingListPackages", "List hosting packages."),
  write("hosting", ["password"], "change <identifier>", "hostingChangePassword", "Change hosting password.", "credential", [
    identifier,
    { name: "newPassword", flag: "--new-password <password>", description: "New hosting password.", required: true, secret: true }
  ], { resourceParams: ["identifier"] }),
  write("hosting", ["package"], "change <identifier>", "hostingChangePackage", "Change hosting package.", "billable", [
    identifier,
    { name: "planName", flag: "--plan-name <plan>", description: "Target plan name.", required: true }
  ], { resourceParams: ["identifier"] }),
  write("hosting", ["temp-url"], "enable <identifier>", "hostingEnableTempUrl", "Enable temporary URL.", "service", [identifier], {
    resourceParams: ["identifier"]
  }),
  write("hosting", ["temp-url"], "disable <identifier>", "hostingDisableTempUrl", "Disable temporary URL.", "service", [identifier], {
    resourceParams: ["identifier"]
  }),
  read("hosting", ["firewall"], "check <ipAddress>", "hostingCheckFirewall", "Check whether an IP is blocked by the firewall.", [
    { name: "ipAddress", description: "IP address to check.", positional: true, required: true }
  ]),
  write("hosting", ["firewall"], "unblock <ipAddress>", "hostingUnblockFirewall", "Unblock an IP from hosting firewall.", "service", [
    { name: "ipAddress", description: "IP address to unblock.", positional: true, required: true }
  ], { resourceParams: ["ipAddress"] }),
  write("hosting", [], "recreate <identifier>", "hostingRecreateService", "Recreate a hosting service without cancelling billing.", "destructive", [
    identifier,
    { name: "newPassword", flag: "--new-password <password>", description: "New password.", secret: true },
    bodyParam
  ], { resourceParams: ["identifier"] }),
  write("hosting", [], "terminate <identifier>", "hostingTerminateService", "Terminate a hosting service.", "destructive", [identifier], {
    resourceParams: ["identifier"]
  }),
  read("hosting", [], "login <identifier>", "hostingGetLogin", "Generate a hosting login link.", [identifier]),

  read("ssl", ["pricing"], "list", "getSSLPricing", "List SSL product information and pricing."),
  read("ssl", [], "get <certID>", "SSL_getSSLCertificate", "Get SSL certificate details.", [certID], {
    includeSecrets: ["cer", "p7b"]
  }),
  read("ssl", [], "status <certID>", "SSL_getCertSimpleStatus", "Get simple SSL certificate status.", [certID]),
  write("ssl", ["csr"], "generate", "SSL_generateCSR", "Generate a CSR and private key.", "credential", [bodyParam], {
    includeSecrets: ["privKey", "csr"]
  }),
  read("ssl", ["csr"], "decode", "SSL_decodeCSR", "Decode a CSR.", [
    { name: "csr", flag: "--csr <csr-or-file>", description: "CSR string or @file.", required: true, secret: true }
  ]),
  write("ssl", [], "purchase", "SSL_purchaseSSLCertificate", "Purchase a new SSL certificate.", "billable", [bodyParam], {
    resourceParams: ["commonName"]
  }),
  write("ssl", [], "reissue <certID>", "SSL_reissueCertificate", "Reissue an SSL certificate.", "service", [
    certID,
    { name: "newCSR", flag: "--new-csr <csr-or-file>", description: "New CSR string or @file.", required: true, secret: true }
  ], { resourceParams: ["certID"], includeSecrets: ["cer", "p7b"] }),
  write("ssl", [], "cancel <certID>", "SSL_cancelSSLCertificate", "Cancel a pending SSL certificate.", "destructive", [certID], {
    resourceParams: ["certID"]
  }),
  write("ssl", [], "renew <certID>", "SSL_renewSSLCertificate", "Renew an SSL certificate.", "billable", [certID, bodyParam], {
    resourceParams: ["certID"]
  }),
  write("ssl", ["email"], "resend-approval <certID>", "SSL_resendDVEmail", "Resend SSL approval email.", "email", [certID], {
    resourceParams: ["certID"]
  }),
  write("ssl", ["email"], "resend-issued <certID>", "SSL_resendIssuedCertificateEmail", "Resend issued certificate email.", "email", [certID], {
    resourceParams: ["certID"]
  }),
  read("ssl", ["validation"], "check-txt <certID>", "SSL_checkTxtCodes", "Force TXT record check for DNS validation.", [certID]),
  read("ssl", [], "list", "SSL_listAllCerts", "List all SSL certificates.", [], { includeSecrets: ["csr", "cer", "p7b"] }),
  read("ssl", ["beacon"], "get <certID> <domainName>", "SSL_getDomainBeacon", "Get domain beacon for validation.", [certID, domainName]),
  read("ssl", ["beacon"], "check <certID> <domainName>", "SSL_checkDomainBeacon", "Check domain beacon validation.", [certID, domainName]),

  write("m365", ["clients"], "create", "subscriptionCreateClient", "Create a Microsoft 365 client.", "billable", [bodyParam], {
    resourceParams: ["email"]
  }),
  write("m365", ["clients"], "update <identifier>", "subscriptionUpdateClient", "Update a Microsoft 365 client.", "service", [
    identifier,
    bodyParam
  ], { resourceParams: ["identifier"] }),
  read("m365", ["clients"], "get <identifier>", "subscriptionGetClient", "Get a Microsoft 365 client.", [identifier]),
  read("m365", ["clients"], "list", "subscriptionListClients", "List Microsoft 365 clients.", [
    { name: "page", description: "Page number to return.", type: "number" }
  ]),
  read("m365", ["subscriptions"], "purchasable", "subscriptionListPurchasable", "List purchasable subscriptions."),
  write("m365", ["subscriptions"], "purchase <identifier>", "subscriptionPurchase", "Purchase Microsoft 365 subscriptions/addons.", "billable", [
    identifier,
    bodyParam
  ], { resourceParams: ["identifier"] }),
  read("m365", ["subscriptions"], "get <identifier>", "subscriptionGetDetails", "Get subscription details.", [identifier]),
  write("m365", ["subscriptions"], "quantity <identifier>", "subscriptionUpdateQuantity", "Update subscription seat quantity.", "billable", [
    identifier,
    { name: "quantity", description: "Replacement seat quantity.", required: true, type: "number" }
  ], { resourceParams: ["identifier"] }),
  write("m365", ["subscriptions"], "suspend <identifier>", "subscriptionSuspend", "Suspend a subscription.", "service", [identifier], {
    resourceParams: ["identifier"]
  }),
  write("m365", ["subscriptions"], "unsuspend <identifier>", "subscriptionUnsuspend", "Unsuspend a subscription.", "service", [identifier], {
    resourceParams: ["identifier"]
  }),
  read("m365", ["subscriptions"], "list-client <identifier>", "subscriptionListClientSubscriptions", "List subscriptions for a client.", [identifier]),
  write("m365", ["subscriptions"], "terminate <identifier>", "subscriptionTerminate", "Terminate a subscription.", "destructive", [identifier], {
    resourceParams: ["identifier"]
  })
];

export const PUBLIC_OPERATION_NAMES = new Set(OPERATIONS.map((definition) => definition.operation));

export function findOperation(operation: string): OperationDefinition | undefined {
  return OPERATIONS.find((definition) => definition.operation === operation);
}
