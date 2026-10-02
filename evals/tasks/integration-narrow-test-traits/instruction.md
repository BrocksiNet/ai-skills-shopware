# Task: repository integration test uses narrow traits

`ProductRepositoryTest` only needs the service container and a rolled-back
transaction. It does not use the sales channel, HTTP cache, or request stack.

Replace `IntegrationTestBehaviour` with `KernelTestBehaviour` and
`DatabaseTransactionBehaviour`. Do not keep the broad bundle.
